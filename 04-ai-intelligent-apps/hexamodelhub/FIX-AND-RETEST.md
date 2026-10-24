# HexaModelHub — Fix & Retest (LAB 40)

For every scored test: the secure implementation that removes the flaw, and the regression check that proves the exploit no longer works. Retest method for all entries: re-run the exact exploit from PRACTICE-GUIDE.md against the fixed build — it must fail — then run the legitimate flow — it must still succeed.

## Login & Authentication

### SQL Injection in Login (Authentication Bypass)
- **Severity:** Critical
- **Secure implementation:** Use parameterised queries everywhere; never concatenate user input into SQL.
- **Regression test:** repeat the exploit for "SQL injection login bypass" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Login & Authentication flow for a legitimate owner/user still completes successfully.

### Missing Brute-Force Protection on Login
- **Severity:** High
- **Secure implementation:** Rate-limit per account and IP, add exponential backoff/lockout and alerting on repeated failures.
- **Regression test:** repeat the exploit for "Brute force — no rate limit or lockout" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Login & Authentication flow for a legitimate owner/user still completes successfully.

### Account Enumeration via Password-Reset Responses
- **Severity:** Medium
- **Secure implementation:** Return one identical generic message regardless of whether the account exists.
- **Regression test:** repeat the exploit for "User enumeration via forgot-password responses" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Login & Authentication flow for a legitimate owner/user still completes successfully.

### Default/Demo Credentials Enabled
- **Severity:** High
- **Secure implementation:** Remove or disable seeded demo accounts in production; force unique credentials at first login.
- **Regression test:** repeat the exploit for "Default demo credentials still active" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Login & Authentication flow for a legitimate owner/user still completes successfully.

### Predictable Password Reset Token
- **Severity:** Critical
- **Secure implementation:** Generate reset tokens from a CSPRNG (≥128 bits), store hashed, single-use, short expiry.
- **Regression test:** repeat the exploit for "Predictable password-reset token" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Login & Authentication flow for a legitimate owner/user still completes successfully.

### Unsigned Session Cookie Allows Role Forgery
- **Severity:** Critical
- **Secure implementation:** Sign session cookies (HMAC) or keep sessions server-side; never trust client-supplied roles.
- **Regression test:** repeat the exploit for "Session cookie role tampering" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Login & Authentication flow for a legitimate owner/user still completes successfully.

## Registration & Profile

### No Minimum Password Strength at Registration
- **Severity:** Medium
- **Secure implementation:** Enforce ≥10 characters and screen against breached-password lists.
- **Regression test:** repeat the exploit for "Weak password policy at registration" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Registration & Profile flow for a legitimate owner/user still completes successfully.

### Mass Assignment in Profile Update
- **Severity:** High
- **Secure implementation:** Whitelist updatable fields server-side; never bind role/plan from client input.
- **Regression test:** repeat the exploit for "Mass assignment — profile update grants admin/plan" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Registration & Profile flow for a legitimate owner/user still completes successfully.

### Stored Cross-Site Scripting in Display Name
- **Severity:** High
- **Secure implementation:** Context-encode all user-supplied output; treat names as text, never HTML.
- **Regression test:** repeat the exploit for "Stored XSS in display name (publisher directory)" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Registration & Profile flow for a legitimate owner/user still completes successfully.

### Missing CSRF Protection on Profile Update
- **Severity:** Medium
- **Secure implementation:** Require per-session anti-CSRF tokens on every state-changing form and verify them server-side.
- **Regression test:** repeat the exploit for "CSRF on profile update" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Registration & Profile flow for a legitimate owner/user still completes successfully.

## Model Listings

### Broken Access Control on Private Model Pages (IDOR)
- **Severity:** High
- **Secure implementation:** Authorise every object read server-side: private objects only to owner/admin.
- **Regression test:** repeat the exploit for "Private model page readable by any user (IDOR)" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Model Listings flow for a legitimate owner/user still completes successfully.

### Unauthorised Download of Private Model Version Files
- **Severity:** High
- **Secure implementation:** Apply the same ownership check on file/download routes as on the model page.
- **Regression test:** repeat the exploit for "Private model version file download (IDOR)" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Model Listings flow for a legitimate owner/user still completes successfully.

### Missing Authorisation on Version Update (Cross-Publisher Tampering)
- **Severity:** High
- **Secure implementation:** Verify model ownership on every mutating version route.
- **Regression test:** repeat the exploit for "Overwrite another publisher's model version" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Model Listings flow for a legitimate owner/user still completes successfully.

### Missing Ownership Check on Model Edit
- **Severity:** High
- **Secure implementation:** Check object ownership before rendering or accepting edits.
- **Regression test:** repeat the exploit for "Edit another publisher's model listing" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Model Listings flow for a legitimate owner/user still completes successfully.

## Model Cards & Search

### Stored Cross-Site Scripting in Model Card
- **Severity:** High
- **Secure implementation:** Sanitise card HTML with an allowlist sanitiser or render as plain text with encoding.
- **Regression test:** repeat the exploit for "Stored XSS in model card description" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Model Cards & Search flow for a legitimate owner/user still completes successfully.

### Reflected Cross-Site Scripting in Search
- **Severity:** Medium
- **Secure implementation:** HTML-encode reflected input; add a restrictive Content-Security-Policy.
- **Regression test:** repeat the exploit for "Reflected XSS in model search" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Model Cards & Search flow for a legitimate owner/user still completes successfully.

### SQL Injection in Model Search
- **Severity:** High
- **Secure implementation:** Parameterise the search query; enforce visibility filters in application code, not just SQL.
- **Regression test:** repeat the exploit for "SQL injection in model search leaks private models" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Model Cards & Search flow for a legitimate owner/user still completes successfully.

## Playground

### Playground Inference Missing Authorisation on Private Models
- **Severity:** High
- **Secure implementation:** Authorise the model on the run endpoint: public or owned models only.
- **Regression test:** repeat the exploit for "Playground runs inference on private models" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Playground flow for a legitimate owner/user still completes successfully.

### Prompt Injection — System Prompt Disclosure
- **Severity:** Medium
- **Secure implementation:** Separate system/user channels, filter instruction-override attempts, never place secrets in prompts.
- **Regression test:** repeat the exploit for "Prompt injection leaks the platform system prompt" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Playground flow for a legitimate owner/user still completes successfully.

## API Keys & Quotas

### Broken Object Level Authorisation on API Key Detail
- **Severity:** Critical
- **Secure implementation:** Scope key lookups to the key owner; never return secrets after creation.
- **Regression test:** repeat the exploit for "API returns other users' key secrets (BOLA)" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal API Keys & Quotas flow for a legitimate owner/user still completes successfully.

### Quota Enforcement Trusts Client-Supplied Usage Header
- **Severity:** High
- **Secure implementation:** Track usage exclusively server-side per key; ignore client-reported counters.
- **Regression test:** repeat the exploit for "API quota bypass via client-reported usage header" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal API Keys & Quotas flow for a legitimate owner/user still completes successfully.

### Predictable Legacy API Keys Derived from Email
- **Severity:** Critical
- **Secure implementation:** Issue CSPRNG keys, retire the legacy derivation scheme, and rotate all derived keys.
- **Regression test:** repeat the exploit for "API key derivable from public email (legacy keys)" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal API Keys & Quotas flow for a legitimate owner/user still completes successfully.

## Stats & Engagement

### Unbounded Like Counter Allows Stats Manipulation
- **Severity:** Medium
- **Secure implementation:** Record one like per user per model; rate-limit counter endpoints.
- **Regression test:** repeat the exploit for "Like/download stats can be inflated without limit" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Stats & Engagement flow for a legitimate owner/user still completes successfully.

### Cross-Publisher Stats Exposure via API
- **Severity:** Medium
- **Secure implementation:** Restrict stats endpoints to the owning publisher or admins.
- **Regression test:** repeat the exploit for "Any user can read any publisher's revenue stats" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Stats & Engagement flow for a legitimate owner/user still completes successfully.

## Admin Panel

### CSRF on Administrative Actions (State-Changing GET)
- **Severity:** High
- **Secure implementation:** Make admin actions POST-only with anti-CSRF tokens and re-authentication for destructive actions.
- **Regression test:** repeat the exploit for "Admin actions are token-less GET links (CSRF)" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Admin Panel flow for a legitimate owner/user still completes successfully.

## Platform & Exposure

### Unauthenticated Debug Endpoint Exposes Credentials
- **Severity:** Critical
- **Secure implementation:** Remove debug routes from production; gate diagnostics behind admin auth and audit logs.
- **Regression test:** repeat the exploit for "Public /debug dumps users, passwords and API keys" — it must be rejected/neutralised (no session, no object access, no state change, no counter change), while the normal Platform & Exposure flow for a legitimate owner/user still completes successfully.
