# HexaAuth — Fix & Retest (LAB 29)

For every scored test: the secure implementation that removes the flaw, and the regression check that proves it stays fixed. Re-run the original exploit after each fix — it must fail — then re-run the lab’s happy paths to confirm nothing legitimate broke.

## Login & Authentication

### SQL Injection in Console Login Allows Authentication Bypass — Critical
- **Remediation:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Secure implementation:** Replace the string-built query with a parameterised lookup by email, then compare the password hash in code.
- **Regression test:** Repeat the exploit from the practice guide (POST /login (console sign-in)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

### No Rate Limiting or Account Lockout on Login Endpoint — High
- **Remediation:** Add progressive delays/lockout per account and IP, CAPTCHA after failures, and enforce MFA.
- **Secure implementation:** Count failures per account+IP; after 5, apply progressive delay and temporary lockout; alert on spikes.
- **Regression test:** Repeat the exploit from the practice guide (POST /login (console sign-in)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

### Account Enumeration via Differential Authentication Responses — Medium
- **Remediation:** Return one generic message ("invalid credentials" / "if the account exists…") for every failure case.
- **Secure implementation:** Return identical messages and timing for unknown-email and wrong-password on both login and forgot-password.
- **Regression test:** Repeat the exploit from the practice guide (POST /login and POST /forgot (differential error messages)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

### Active Default/Demo Account with Known Password — High
- **Remediation:** Remove demo/default accounts before production; force unique credentials for every seeded user.
- **Secure implementation:** Delete the demo account from seeds; require unique generated passwords for any seeded account.
- **Regression test:** Repeat the exploit from the practice guide (Seeded demo console account (demo@hexaauth.local)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

### Password Reset Tokens Are Predictable (ID + Timestamp) — Critical
- **Remediation:** Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, single use.
- **Secure implementation:** Issue 128-bit CSPRNG tokens, store only their hash, expire after 15 minutes, delete on first use.
- **Regression test:** Repeat the exploit from the practice guide (POST /forgot + POST /reset (token = rst-<userId>-<epoch minute>)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

### Admin Authorization Based on Client-Controlled Role Cookie — Critical
- **Remediation:** Derive roles from the server-side session record on every request; never trust client-supplied role claims.
- **Secure implementation:** Remove role from the cookie entirely; read the role from the server-side session record on every admin request.
- **Regression test:** Repeat the exploit from the practice guide (GET /admin (gate trusts the client-supplied hx_role cookie)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

## Registration & Profile

### No Minimum Password Strength Enforced at Registration — Medium
- **Remediation:** Enforce a minimum length (≥12) and breached-password screening (e.g. NIST 800-63B) at registration and reset.
- **Secure implementation:** Enforce minimum 12 characters plus a breached-password blocklist at register/reset; reject shorter passwords with 400.
- **Regression test:** Repeat the exploit from the practice guide (POST /register (no length/complexity check)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

### Mass Assignment Allows Privilege Escalation at Registration — Critical
- **Remediation:** Use an explicit field allow-list (DTO) for registration; set role/plan server-side only.
- **Secure implementation:** Build the new user from an explicit allow-list ({name, email, password}); ignore every other body field.
- **Regression test:** Repeat the exploit from the practice guide (POST /register (whole body bound to the user record, incl. role)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

### Stored Cross-Site Scripting via Display Name — High
- **Remediation:** Contextually output-encode all user-supplied fields at render; add a Content-Security-Policy as defence in depth.
- **Secure implementation:** Output-encode the display name at every render site (directory, admin, app pages); add CSP default-src 'self'.
- **Regression test:** Repeat the exploit from the practice guide (Display name from POST /register / POST /profile, rendered unescaped in the /admin user list). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

### Missing CSRF Token Verification on Profile Update — Medium
- **Remediation:** Issue per-session CSRF tokens and verify them on every state-changing request; use SameSite cookies as defence in depth.
- **Secure implementation:** Verify hx_marker against the session record on POST /profile; reject missing/mismatched tokens with 403.
- **Regression test:** Repeat the exploit from the practice guide (POST /profile (hx_marker issued but never verified)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

## Tenant Apps & Clients

### Broken Access Control on Tenant Application Settings (IDOR) — High
- **Remediation:** Check app.ownerId against the session user on every app route; return 404 for objects outside the caller’s tenancy.
- **Secure implementation:** Load the app by id AND ownerId = session user; return 404 when the pair does not match.
- **Regression test:** Repeat the exploit from the practice guide (GET /apps/<id> (no ownership check)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

### OAuth Client Secret Disclosed to Other Tenants via API — Critical
- **Remediation:** Return only allow-listed fields; never serialise secrets; restrict app metadata to the owning team.
- **Secure implementation:** Serialise apps through a DTO that excludes clientSecret/apiKey; only the owner may ever see the secret, once, at creation/rotation.
- **Regression test:** Repeat the exploit from the practice guide (GET /api/apps/<id> (full record serialised, incl. clientSecret)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

### Subscription Plan Editable via Mass Assignment on App Update — High
- **Remediation:** Allow-list editable fields (name, redirect URIs); change plans only through the verified billing flow.
- **Secure implementation:** Allow-list update fields to {name, redirectUri}; change plan only inside the billing webhook handler.
- **Regression test:** Repeat the exploit from the practice guide (POST /apps/<id>/update (plan field bound from the request body)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

## OAuth Flow

### OAuth Redirect URI Prefix Matching Allows Code Interception — High
- **Remediation:** Require exact string match against the registered redirect URI list; reject anything else.
- **Secure implementation:** Compare redirect_uri with strict equality against the registered list; reject on any deviation.
- **Regression test:** Repeat the exploit from the practice guide (POST /oauth/authorize/approve (redirect_uri checked with startsWith on the origin)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

### Access Tokens Are Predictable Encodings (No Signature/Randomness) — Critical
- **Remediation:** Issue opaque random tokens (≥128 bits) stored server-side, or sign tokens with a strong secret and verify the signature.
- **Secure implementation:** Issue 128-bit random opaque tokens stored server-side (or signed JWTs verified with the platform secret).
- **Regression test:** Repeat the exploit from the practice guide (GET /api/me (access token = hxat_<base64 "euId:appId">.<counter>, no signature)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

### OAuth Authorization Codes Are Reusable (Not Invalidated After Exchange) — High
- **Remediation:** Invalidate each code on first exchange, expire codes within minutes, and bind codes to client + redirect URI.
- **Secure implementation:** Delete the code record on first exchange; on a second presentation, revoke all tokens minted from that code.
- **Regression test:** Repeat the exploit from the practice guide (POST /oauth/token (codes never invalidated after exchange)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

## End Users & MFA

### End-User Credentials of Other Tenants Exposed (Broken Access Control) — Critical
- **Remediation:** Enforce ownership checks on user-management routes; never store or display plaintext passwords or MFA secrets.
- **Secure implementation:** Apply the same owner check as the settings page; store passwords hashed and never render MFA secrets.
- **Regression test:** Repeat the exploit from the practice guide (GET /apps/<id>/users (no ownership check; prints passwords + MFA codes)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

### MFA Verification Bypass via Unrestricted Pending Session — High
- **Remediation:** Keep pre-MFA sessions in a separate restricted store; require mfaVerified before issuing the real session.
- **Secure implementation:** Issue only a restricted pre-auth session at password step; create the real session only after MFA verification.
- **Regression test:** Repeat the exploit from the practice guide (GET /enduser/home (pre-MFA pending session already trusted)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

### Predictable Per-App API Keys Allow Unauthenticated User-List Access — Critical
- **Remediation:** Generate API keys with a CSPRNG (≥128 bits), store hashed, and support rotation/revocation.
- **Secure implementation:** Generate keys from a CSPRNG (e.g. hx_live_ + 32 random chars), store hashed, show once, support rotation.
- **Regression test:** Repeat the exploit from the practice guide (GET /api/apps/<id>/users with X-Api-Key: hx_live_<appId>). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

## SSO Configuration

### SSO Configuration Writable by Non-Owner Tenants — Critical
- **Remediation:** Enforce ownership + admin role on SSO configuration writes; audit-log and alert on IdP changes.
- **Secure implementation:** Require owner + platform-admin step-up auth for SSO writes; write an audit-log entry and email the owner on IdP changes.
- **Regression test:** Repeat the exploit from the practice guide (POST /apps/<id>/sso (no ownership check on SSO writes)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

### SSO Login Accepts Unverified Email Assertions (No IdP Proof) — Critical
- **Remediation:** Implement real SAML/OIDC with signature validation against the configured IdP; never trust client-supplied identity claims.
- **Secure implementation:** Implement real SAML/OIDC: redirect to the IdP, validate the signed assertion/response before creating any session.
- **Regression test:** Repeat the exploit from the practice guide (POST /sso/login (typed email trusted as a verified IdP assertion)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

## Admin Panel

### Administrative State Change via GET Without CSRF Protection — High
- **Remediation:** Use POST/DELETE with per-session CSRF tokens for all state changes; never mutate state in GET handlers.
- **Secure implementation:** Change disable to POST with a verified CSRF token; make GET handlers read-only.
- **Regression test:** Repeat the exploit from the practice guide (GET /admin/users/<id>/disable (state change via GET, no token)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

## Platform & API

### Unauthenticated API Endpoint Returns All Console Users with Passwords — Critical
- **Remediation:** Require authentication and admin authorization on user-listing endpoints; never return password fields.
- **Secure implementation:** Require a valid admin session on /api/console/users and strip password fields from the response DTO.
- **Regression test:** Repeat the exploit from the practice guide (GET /api/console/users (no authentication at all)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.

### Debug Endpoint Exposes Platform Configuration and Signing Secret — Critical
- **Remediation:** Remove debug endpoints from production builds; rotate the leaked signing secret; gate diagnostics behind admin auth and IP allow-lists.
- **Secure implementation:** Remove /debug from production builds; if diagnostics are needed, bind them to localhost + admin auth.
- **Regression test:** Repeat the exploit from the practice guide (GET /debug (production diagnostics incl. token-signing secret)). It must now fail (401/403/400 or a generic error), while the legitimate flow still succeeds.
