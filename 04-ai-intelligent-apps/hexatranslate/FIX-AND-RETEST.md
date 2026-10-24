# HexaTranslate — Fix & Retest Guide (25 findings)

For every scored test: the secure implementation that removes the flaw, and the
regression check (retest) that proves the original exploit no longer works while
the legitimate feature still does.


## Login & Authentication

### SQL Injection in authentication allows login bypass — Severity: Critical
- **Secure implementation:** Use parameterised queries everywhere and never build SQL by concatenating user input.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("SQL Injection login bypass") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.

### Missing brute-force protection on login — Severity: High
- **Secure implementation:** Add rate limiting, progressive delays and lockout/alerting after repeated failures per account and IP.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Brute force — no rate limit or lockout on login") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.

### Account enumeration through differing authentication responses — Severity: Medium
- **Secure implementation:** Return one generic message ("invalid credentials" / "if the account exists…") for every failure case.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("User enumeration via login & password-reset responses") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.

### Accounts with default / weak passwords — Severity: High
- **Secure implementation:** Force password changes for seeded accounts, block known-breached passwords and enforce a real password policy.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Weak & default credentials on live accounts") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.

### Predictable password reset tokens allow account takeover — Severity: Critical
- **Secure implementation:** Generate reset tokens from a CSPRNG (≥128 bits), store them hashed, single-use, with a short expiry.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Predictable password-reset token") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.


## Account & Profile

### No minimum password strength enforced at registration — Severity: Medium
- **Secure implementation:** Enforce a minimum length (≥10) and breached-password screening on the server.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Weak password policy at registration") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.

### Mass assignment allows privilege and billing manipulation — Severity: High
- **Secure implementation:** Whitelist assignable fields explicitly on every endpoint; never bind raw request bodies to models.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Mass assignment at registration (plan / credits / role)") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.

### Stored cross-site scripting via profile display name — Severity: High
- **Secure implementation:** Contextually encode all user output and add a Content-Security-Policy header.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Stored XSS in profile display name") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.

### Missing CSRF protection on profile update — Severity: Medium
- **Secure implementation:** Require a per-session anti-CSRF token on every state-changing form and verify Origin/Referer.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("CSRF on profile update") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.


## Translation Projects

### Insecure direct object reference on translation projects — Severity: High
- **Secure implementation:** Enforce per-object ownership/role checks on every project read.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Project IDOR — read another user's project") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.

### Project export endpoint lacks authorisation checks — Severity: High
- **Secure implementation:** Apply the same ownership checks on export endpoints as on the UI, and log bulk exports.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Export another user's project (data exfiltration)") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.

### Missing authorisation on project deletion — Severity: High
- **Secure implementation:** Verify ownership (or an admin role) before any destructive operation, and soft-delete with audit logs.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Delete another user's project by id") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.


## Translation Memory

### Shared translation memory accepts unauthenticated-quality writes (poisoning) — Severity: High
- **Secure implementation:** Scope TM writes per tenant, review shared entries, and version entries so poisoned rows can be rolled back.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Translation-memory poisoning leaks into other users' output") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.

### Stored XSS via glossary term rendered in translation output — Severity: High
- **Secure implementation:** Encode glossary terms on output everywhere they are rendered, including generated documents.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Stored XSS through glossary term into translation output") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.


## Glossaries & Term Bases

### Private glossary readable by any authenticated user (IDOR) — Severity: Medium
- **Secure implementation:** Check the glossary visibility and ownership on the server for every read.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Private glossary IDOR — read another user's term base") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.

### Missing authorisation allows writing to foreign glossaries — Severity: Medium
- **Secure implementation:** Verify glossary ownership (or editor role) on every term write.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Add terms to another user's glossary") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.


## Review Workflow

### Review approval not restricted to the assigned reviewer — Severity: High
- **Secure implementation:** Enforce reviewer assignment (or admin role) server-side on approve/reject actions and log the actor.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Reviewer-role bypass — approve a review assigned to someone else") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.


## Credits & Billing

### Credit top-up accepts negative amounts — Severity: Medium
- **Secure implementation:** Validate amounts server-side (positive, within plan limits) and reject non-numeric input.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Negative top-up accepted (no amount validation)") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.

### Negative transfer amount reverses credit flow — Severity: High
- **Secure implementation:** Reject non-positive transfer amounts and verify sender balance before applying.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Negative credit transfer steals credits from the recipient") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.


## API & Platform

### Predictable API tokens derived from email addresses — Severity: Critical
- **Secure implementation:** Issue random, high-entropy API keys, store them hashed, and support revocation and rotation.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("API token is just base64 of the account email") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.

### Unauthenticated user-list endpoint exposes credentials — Severity: Critical
- **Secure implementation:** Require authentication and role checks on all API routes; never serialise password fields.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Unauthenticated /api/users dumps every account incl. passwords") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.

### Debug endpoint exposes secrets and configuration — Severity: High
- **Secure implementation:** Remove debug endpoints from production, or gate them behind admin auth and IP allowlists.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("/debug endpoint exposes configuration and secrets") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.

### Missing HTTP security headers — Severity: Low
- **Secure implementation:** Add CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy and HSTS at the server.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Missing HTTP security headers") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.


## Admin Panel

### Client-controlled role cookie enables privilege escalation — Severity: Critical
- **Secure implementation:** Store roles in the server-side session only; ignore client-supplied role claims.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("Role cookie tampering opens the admin panel") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.

### Missing CSRF protection on administrative user deletion — Severity: High
- **Secure implementation:** Add anti-CSRF tokens to all admin actions and require confirmation for destructive operations.
- **Retest:** repeat the original attack exactly as described in PRACTICE-GUIDE.md ("CSRF on admin user deletion") — it must now fail (access denied / generic error / value rejected), the corresponding test must stay incomplete on a fresh lab, and the normal user flow for that feature must still succeed end-to-end.
