# HexaForms — Fix & Retest Guide

For every scored test: the secure implementation that removes the flaw, and the retest that proves it. Method: copy the lab, apply the fix in the copy, re-run the exact exploit from PRACTICE-GUIDE.md — it must now fail — then confirm the legitimate flow still works.


## Login & Authentication

### SQL injection login bypass (Critical)
- **Secure implementation:** Use parameterised queries everywhere; never concatenate input into SQL.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("SQL injection login bypass") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.

### Brute force — no rate limiting or lockout (High)
- **Secure implementation:** Throttle per account and per IP, add progressive delays/lockout and alerting.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("Brute force — no rate limiting or lockout") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.

### User enumeration via differing responses (Medium)
- **Secure implementation:** Return one generic message for all failed logins and reset requests.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("User enumeration via differing responses") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.

### Weak / default credentials (demo account) (High)
- **Secure implementation:** Remove seeded demo accounts from production, or force a unique password at first login.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("Weak / default credentials (demo account)") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.

### Predictable password-reset token (Critical)
- **Secure implementation:** Use crypto.randomBytes tokens, hashed at rest, single-use, expiring in ~15 minutes.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("Predictable password-reset token") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.

### Session/cookie tampering — client role cookie trusted (Critical)
- **Secure implementation:** Read roles from the server-side session/user record only; ignore client-supplied role data.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("Session/cookie tampering — client role cookie trusted") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.


## Accounts & Profile

### Weak password policy on registration (Medium)
- **Secure implementation:** Enforce a minimum length (12+) and screen against breached-password lists.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("Weak password policy on registration") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.

### Mass assignment — plan & role via profile update (Critical)
- **Secure implementation:** Allowlist bindable fields per endpoint; never bind role/plan/billing fields from profile forms.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("Mass assignment — plan & role via profile update") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.

### Stored XSS in display name (High)
- **Secure implementation:** Escape all user-controlled output by default; add a Content-Security-Policy as defence in depth.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("Stored XSS in display name") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.

### CSRF on profile update (High)
- **Secure implementation:** Verify a per-session anti-CSRF token (or SameSite=Lax cookies plus Origin checks) on every state change.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("CSRF on profile update") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.


## Forms & Templates

### IDOR — view another workspace's form settings (High)
- **Secure implementation:** Authorize every object access against the session user's workspace membership.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("IDOR — view another workspace's form settings") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.

### Access-setting tampering — private form flipped public (Critical)
- **Secure implementation:** Allowlist settings fields; route access changes through the approval workflow server-side.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("Access-setting tampering — private form flipped public") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.

### Form slug / ID enumeration (Medium)
- **Secure implementation:** Use unguessable public slugs (random tokens), rate-limit public endpoints, and answer uniformly.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("Form slug / ID enumeration") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.

### Submitting to a private form (access check missing on submit) (High)
- **Secure implementation:** Enforce the form's access mode on the submission endpoint exactly as on the render path.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("Submitting to a private form (access check missing on submit)") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.


## Submissions & Responses

### IDOR — read another workspace's submission (Critical)
- **Secure implementation:** Authorize submission reads against the parent form's workspace membership.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("IDOR — read another workspace's submission") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.

### Unauthorised response export (CSV) (Critical)
- **Secure implementation:** Require workspace membership (owner/member) for exports; audit-log every export.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("Unauthorised response export (CSV)") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.

### Stored XSS in a submission (fires in owner dashboard) (High)
- **Secure implementation:** Escape respondent content everywhere it renders; sanitize if rich text is ever allowed.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("Stored XSS in a submission (fires in owner dashboard)") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.

### IDOR — download another workspace's attachment (High)
- **Secure implementation:** Authorize attachment downloads via the parent submission's workspace.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("IDOR — download another workspace's attachment") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.


## Files & Uploads

### Unrestricted file upload — HTML served back (High)
- **Secure implementation:** Allowlist safe types, verify content, serve downloads as attachments with nosniff.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("Unrestricted file upload — HTML served back") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.

### Path traversal on asset download (Critical)
- **Secure implementation:** Resolve the final path and verify it stays inside the asset directory; reject ".." outright.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("Path traversal on asset download") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.


## Admin Panel

### CSRF on admin user-role change (Critical)
- **Secure implementation:** Verify anti-CSRF tokens on all admin actions; consider re-authentication for role changes.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("CSRF on admin user-role change") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.

### Broken access control — user export open to any account (Critical)
- **Secure implementation:** Enforce the admin role on every admin route, server-side, with deny-by-default.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("Broken access control — user export open to any account") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.


## Platform & API

### Weak / predictable API token (High)
- **Secure implementation:** Generate tokens from crypto.randomBytes, store hashed, allow revocation and rotation.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("Weak / predictable API token") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.

### Sensitive data exposure — /api/users dumps all accounts (Critical)
- **Secure implementation:** Require authenticated, authorized access; never return password fields in API responses.
- **Retest:** repeat the walkthrough in PRACTICE-GUIDE.md ("Sensitive data exposure — /api/users dumps all accounts") against the fixed copy. Expected after the fix: the exploit no longer produces its effect (no session, no cross-workspace data, no state change), while the normal user flow for the same feature still succeeds.
