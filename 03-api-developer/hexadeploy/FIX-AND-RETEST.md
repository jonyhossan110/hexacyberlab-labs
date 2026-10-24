# HexaDeploy — Fix & Retest (LAB 24)

For every scored test: the secure implementation and a regression check that proves the fix. Apply the fix in a copy of the lab, re-run the original exploit, and confirm it now fails while legitimate use still works.

## Login & Authentication

### SQL Injection — Login Bypass
- **Finding (report):** SQL Injection in Login Form Allows Authentication Bypass — Severity: Critical
- **Fix:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("sqli-login"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

### Brute Force — No Rate Limiting on Login
- **Finding (report):** No Rate Limiting or Account Lockout on Login Endpoint — Severity: High
- **Fix:** Add progressive delays/lockout per account and IP, CAPTCHA after failures, and offer MFA.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("brute-force"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

### User Enumeration via Login & Reset Responses
- **Finding (report):** Account Enumeration via Differential Authentication Responses — Severity: Medium
- **Fix:** Return one generic message ("invalid credentials" / "if the account exists…") for every failure case.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("user-enumeration"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

### Default / Demo Credentials Still Active
- **Finding (report):** Active Default/Demo Account with Known Password — Severity: High
- **Fix:** Remove demo/default accounts before production; force unique credentials for every seeded user.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("default-creds"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

### Predictable Password-Reset Token
- **Finding (report):** Password Reset Tokens Are Predictable (ID + Timestamp) — Severity: Critical
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, single use.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("reset-token"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

### Session/Role Cookie Tampering
- **Finding (report):** Platform Role Trusted from Unsigned Client Cookie — Severity: Critical
- **Fix:** Keep authorisation state server-side in the session; never trust client-supplied role values.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("cookie-tamper"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

## Registration & Profile

### Weak Password Policy (1-Character Passwords)
- **Finding (report):** Registration Accepts Trivially Weak Passwords — Severity: Medium
- **Fix:** Enforce a minimum length (≥10) and screen against known-breached password lists.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("weak-password"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

### Mass Assignment — Self-Assigning the Admin Role
- **Finding (report):** Mass Assignment Allows Privilege Escalation via role Parameter — Severity: Critical
- **Fix:** Whitelist bindable fields explicitly; never bind role/privilege fields from client input.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("mass-assignment"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

### Stored XSS via Display Name
- **Finding (report):** Stored Cross-Site Scripting in User Display Name — Severity: High
- **Fix:** Context-encode all user-controlled output; sanitise stored rich text with an allowlist.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("stored-xss-name"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

### CSRF on Profile Update
- **Finding (report):** Cross-Site Request Forgery on Profile Update (Token Not Verified) — Severity: Medium
- **Fix:** Verify the anti-CSRF token server-side on every state-changing request; enforce SameSite cookies.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("profile-csrf"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

## Projects

### Cross-Project IDOR — Reading Another Team’s Project
- **Finding (report):** Insecure Direct Object Reference on Project Detail (No Membership Check) — Severity: High
- **Fix:** Check project membership/ownership on every project-scoped query; scope queries by the caller’s memberships.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("project-idor"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

### Search Leaks Other Projects’ Environments & Builds
- **Finding (report):** Search Results Not Scoped by Project Membership (Information Disclosure) — Severity: Medium
- **Fix:** Apply the same membership filters to search queries as to direct object access.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("search-disclosure"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

## Builds & Pipelines

### Build Log IDOR — Reading Another Project’s Build Logs
- **Finding (report):** Insecure Direct Object Reference on Build Log (No Project Check) — Severity: High
- **Fix:** Authorise build-log access against the parent project’s membership on every request.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("build-idor"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

### Production Secrets Printed in Build Logs
- **Finding (report):** Production Secrets Exposed in Build Logs (Unmasked Environment Dump) — Severity: Critical
- **Fix:** Mask all secret variables in CI output, block env/printenv debug steps, restrict log access, and rotate the exposed secrets.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("secret-in-build-log"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

### Build-Log Injection via Version String
- **Finding (report):** Build Version String Injected into Pipeline Log (Log Forging / Env Dump) — Severity: High
- **Fix:** Validate version strings against a strict semver pattern; never pass raw user input into shell steps; sanitise log output.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("build-log-injection"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

## Environments & Secrets

### Environment IDOR — Reading Another Project’s Production Secrets
- **Finding (report):** Insecure Direct Object Reference on Environment Secrets (No Project Check) — Severity: Critical
- **Fix:** Check project membership AND production-access role on every environment read; mask secret values by default.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("env-idor"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

### Secret Variable Tampering by a Read-Only Viewer
- **Finding (report):** Missing Authorisation on Production Secret Update (Viewer Can Tamper) — Severity: Critical
- **Fix:** Require the production/owner role server-side for secret writes; audit-log every change; consider dual approval for production.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("secret-tamper"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

### Viewer Creates a Production Environment
- **Finding (report):** Missing Authorisation on Environment Creation (Viewer Can Create Production) — Severity: High
- **Fix:** Restrict environment creation to project owners; validate the kind server-side; audit new environments.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("env-create-prod"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

## Deployments & Rollback

### Deploy to Production Without the Production Role
- **Finding (report):** Missing Role Check on Production Deployment (Viewer Can Deploy) — Severity: Critical
- **Fix:** Enforce owner/developer role server-side for production deploys; log and notify on every production release.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("prod-deploy-role"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

### Rollback Abuse — Reverting Production Without Rights
- **Finding (report):** Missing Authorisation on Production Rollback — Severity: High
- **Fix:** Require the production role server-side for rollbacks; audit-log them and notify the project owners.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("rollback-abuse"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

## Team & Roles

### Team Role Escalation — Non-Owner Rewrites Project Roles
- **Finding (report):** Missing Authorisation on Team Role Management — Severity: High
- **Fix:** Restrict role changes to project owners server-side; audit all privilege changes.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("role-escalation"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

### Member Removes the Project Owner
- **Finding (report):** Project Owner Removable by Non-Owner Team Members — Severity: High
- **Fix:** Only owners can remove members; the project owner can never be removed by another member; require transfer-of-ownership flow instead.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("kick-owner"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

## Admin Panel

### Destructive Admin Action as a Plain GET (CSRF)
- **Finding (report):** State-Changing Admin Action on GET Without CSRF Protection (Deploy History Purge) — Severity: High
- **Fix:** Make destructive actions POST-only with a verified anti-CSRF token and an explicit confirmation step; keep an immutable audit log.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("admin-csrf"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

## Platform & API

### Unauthenticated API Dumps Every User (Passwords Included)
- **Finding (report):** Unauthenticated API Endpoint Exposes All Users Including Passwords — Severity: Critical
- **Fix:** Require authentication and authorisation on every API endpoint; never serialise password fields.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("api-user-dump"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

### Weak Static API Key Leaks Projects & Secrets
- **Finding (report):** Documented Static API Key Grants Full Read Access to Projects and Secrets — Severity: Critical
- **Fix:** Issue per-client high-entropy keys, scope them least-privilege, keep secrets out of API responses, and rotate the leaked key.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("api-weak-key"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.

### Guessable Environment Share Links (Sequential Tokens)
- **Finding (report):** Environment Share Tokens Are Sequential and Enumerable — Severity: High
- **Fix:** Generate share tokens with a CSPRNG (≥128 bits), support revocation and expiry, and never derive them from object IDs.
- **Retest:** repeat the original exploit exactly as described in PRACTICE-GUIDE.md ("share-token-enum"). Expected after the fix: the exploit effect no longer occurs (no session/object/state change is granted), the attempt is rejected or safely handled, and the corresponding /tests entry can no longer be flipped by that technique. Then repeat the legitimate workflow to confirm no regression.
