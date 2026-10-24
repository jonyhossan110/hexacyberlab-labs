# HexaTax — Fix & Retest

For every scored test: the secure implementation that removes the flaw, and the regression test
that proves it stays removed. Written the way findings are closed out in a real client engagement.

## Login & Authentication

### SQL Injection in Login Form Allows Full Authentication Bypass
- **Severity:** Critical
- **Fix:** Replace the string-built login query with a parameterized query (placeholders for email and password) so input can never change the query structure.
- **Report remediation:** Use parameterized queries for all database access and add a regression test with injection payloads on every form.
- **Retest:** Log in with the payload admin' OR '1'='1 — it must fail like any wrong password; then log in with real credentials to confirm normal login still works.

### Missing Rate Limiting and Account Lockout on Login
- **Severity:** High
- **Fix:** Add per-account and per-IP rate limiting with progressive delays, lock the account after 10 consecutive failures, and alert on spikes.
- **Report remediation:** Add progressive delays, lockout after repeated failures, and alerting on password-spraying patterns.
- **Retest:** Submit 15 wrong passwords for one account — attempts must slow down and then be refused/locked; a correct login after the lockout window (or admin unlock) still works.

### Account Enumeration Through Divergent Authentication Error Messages
- **Severity:** Medium
- **Fix:** Return the identical generic message ("Invalid email or password") and identical timing for unknown emails and wrong passwords, on login and on forgot-password.
- **Report remediation:** Return one generic message for all failed logins and reset requests regardless of account existence.
- **Retest:** Probe one real and one invented email on both forms — the responses must be indistinguishable.

### Default Credentials Active on the Administrator Account
- **Severity:** Critical
- **Fix:** Force the installer to set a unique admin password on first boot; disable or rename vendor default accounts; scan deployments for known defaults.
- **Report remediation:** Force a unique admin password at installation and disable any vendor default accounts.
- **Retest:** Try admin123 and other published defaults on every seeded/staff account — none may authenticate.

### Password Reset Token Predictable (MD5 of Email Address)
- **Severity:** High
- **Fix:** Generate reset tokens from a CSPRNG (at least 128 bits), store only a hash of the token, expire after 30 minutes, single use, and invalidate on password change.
- **Report remediation:** Generate reset tokens from a CSPRNG, store only a hash, expire them quickly and make them single-use.
- **Retest:** Request a reset, confirm the token is not derivable from the email (md5/sha of email must fail), use it once, and confirm reuse and expired tokens are rejected.

### Broken Access Control - Role Trusted from a Client-Side Cookie
- **Severity:** Critical
- **Fix:** Keep the role only in the server-side session record; never read authorization data from cookies or other client input.
- **Report remediation:** Keep roles in the server-side session record and ignore role data supplied by the client.
- **Retest:** Log in as a taxpayer, set hx_role=admin, and open /admin — access must be denied.

## Registration & Profile

### Registration Accepts Single-Character Passwords
- **Severity:** Medium
- **Fix:** Enforce a minimum password length of 10+ characters and screen new passwords against a breached/common password list.
- **Report remediation:** Enforce a minimum length of at least 10 characters and screen against common-password lists.
- **Retest:** Registration with a 1-character and a common password must be rejected; a strong password is accepted.

### Mass Assignment Allows Self-Granting of Privileged Roles
- **Severity:** High
- **Fix:** Bind request bodies through an explicit whitelist (name, email, password only); assign roles solely through admin workflows.
- **Report remediation:** Whitelist assignable fields per endpoint and set roles only through administrative workflows.
- **Retest:** Register with extra role/isAdmin fields — the account must be created as a plain taxpayer.

### Stored Cross-Site Scripting in the Profile Display Name
- **Severity:** High
- **Fix:** Contextually output-encode all user-supplied values everywhere they render, and add a restrictive Content Security Policy.
- **Report remediation:** Contextually encode all user-supplied values on output and add a Content Security Policy.
- **Retest:** Set the display name to a script payload — it must render as inert text on the dashboard and staff views.

### Missing CSRF Protection on Profile Update
- **Severity:** Medium
- **Fix:** Issue per-session CSRF tokens for every state-changing form, validate them server-side, and check Origin/Referer as defense in depth.
- **Report remediation:** Add per-session CSRF tokens to all state-changing forms and validate Origin headers.
- **Retest:** Replay the profile update without a token and with a cross-site Origin — both must be rejected with no change applied.

## Tax Returns

### Insecure Direct Object Reference on Tax Return Detail Page
- **Severity:** Critical
- **Fix:** On every return fetch, verify the requester owns the return or holds a staff role with a business need; use unguessable return references.
- **Report remediation:** Enforce per-object ownership or role checks on every return access and use unguessable identifiers.
- **Retest:** As taxpayer A, request taxpayer B's return by ID — it must return 403/404; staff roles retain their legitimate access.

### Server Trusts Client-Supplied Tax Calculation (Hidden Field Tampering)
- **Severity:** Critical
- **Fix:** Ignore any client-supplied computed values; recompute tax server-side from the validated source figures on every save.
- **Report remediation:** Ignore all client-supplied computed values and recompute tax server-side from validated inputs.
- **Retest:** Save a return with a forged computedTax field — the stored tax must equal the server-computed amount.

### Missing Server-Side Validation of Deduction Limits
- **Severity:** High
- **Fix:** Validate each deduction against its statutory cap server-side (charity at most 60% of income; total deductions cannot exceed income) and reject violations.
- **Report remediation:** Validate every deduction against its statutory cap server-side and reject out-of-range returns.
- **Retest:** Submit returns with an over-cap charity deduction and with deductions above income — both must be rejected.

### Workflow Bypass - Taxpayer Can Set Return Status Directly to Filed
- **Severity:** High
- **Fix:** Remove status from user-editable fields; expose separate workflow endpoints (submit/prepare/approve) each enforcing the required role and current state.
- **Report remediation:** Remove status from user-editable fields and drive transitions through role-checked workflow endpoints.
- **Retest:** As a taxpayer, attempt to set status=filed through create/edit — the status must not change; the normal preparer/reviewer flow still advances it.

### Missing Immutability Control - Filed Tax Returns Remain Editable
- **Severity:** High
- **Fix:** Make filed returns immutable; corrections go through an amendment flow that creates a new versioned record with its own review.
- **Report remediation:** Block edits on filed returns and route corrections through a tracked amendment workflow.
- **Retest:** Attempt to edit figures on a filed return — the save must be refused and the record unchanged.

## Documents

### Insecure Direct Object Reference on Document Downloads
- **Severity:** High
- **Fix:** Check document ownership (or staff role) on every download and raw view, exactly as on the parent return.
- **Report remediation:** Check document ownership against the session on every download.
- **Retest:** As taxpayer A, request taxpayer B's document by ID — download and raw view must both be denied.

### Unrestricted File Upload - HTML Files Served Inline from the Application Origin
- **Severity:** High
- **Fix:** Whitelist document types (PDF/images/text), verify content type by inspection, store uploads outside the web root, and always serve with Content-Disposition: attachment and X-Content-Type-Options: nosniff.
- **Report remediation:** Whitelist allowed types, verify content, store outside the web root and serve with Content-Disposition attachment.
- **Retest:** Upload an .html file with a script payload — it must be rejected or download as an inert attachment, never render as a page from the app origin.

### Path Traversal in Document Viewer Exposes Application Source
- **Severity:** High
- **Fix:** Serve files by document ID, never by user-supplied path; if paths are unavoidable, canonicalize and verify the resolved path stays inside the documents directory.
- **Report remediation:** Canonicalize requested paths, confine them to the documents directory and serve files by ID instead.
- **Retest:** Request ../server.js and encoded variants through the viewer — all must return 404/403 and never file contents.

## Search & Exports

### SQL Injection in Return Search Returns All Taxpayer Records
- **Severity:** Critical
- **Fix:** Parameterize the search query and scope results by role and ownership before filtering.
- **Report remediation:** Parameterize the search query and scope results to the requester role and ownership.
- **Retest:** Search with a tautology payload as a taxpayer — results must contain only that taxpayer's matching returns.

### Reflected Cross-Site Scripting in Return Search
- **Severity:** Medium
- **Fix:** Output-encode the search term wherever it is reflected, and add a Content Security Policy.
- **Report remediation:** Encode the search term on output and deploy a Content Security Policy.
- **Retest:** Search with a script payload — it must appear as inert text in the results heading.

### Excessive Data Exposure - Export Endpoint Returns All Taxpayer Records to Any User
- **Severity:** Critical
- **Fix:** Scope exports to the requester's own records for non-admin roles, require admin for full exports, and audit-log every export.
- **Report remediation:** Scope exports to the requester own records unless the role is admin, and log all exports.
- **Retest:** As a taxpayer, download the export — it must contain only their returns; TIN/bank columns should be minimized.

## Admin Panel

### State-Changing GET Endpoint Allows CSRF Deactivation of User Accounts
- **Severity:** High
- **Fix:** Convert deactivation to a POST form with a per-session CSRF token and a confirmation step; never change state on GET.
- **Report remediation:** Convert admin actions to token-protected POSTs and require confirmation for destructive actions.
- **Retest:** Visit the old GET link while logged in as admin — nothing may change; the POST form with a valid token still works.

### Missing Authorization on Admin Audit Page Exposes Passwords and TINs
- **Severity:** Critical
- **Fix:** Apply the admin role check in a central guard for every /admin route; never display stored passwords anywhere (store hashes only).
- **Report remediation:** Apply the admin role check centrally to all /admin routes and never display stored passwords.
- **Retest:** As a taxpayer and as staff, open /admin/audit — it must return 403; as admin it lists accounts without plaintext passwords.

## Platform & API

### Predictable API Token (Base64 of Email) Grants Full Data Access
- **Severity:** Critical
- **Fix:** Issue random, per-user API secrets (shown once), scope every response to the token owner, support revocation and rotation.
- **Report remediation:** Issue random per-user API secrets, scope responses to the token owner and support revocation.
- **Retest:** Derive the old base64-of-email token and call the API — it must be rejected; a real issued token returns only the owner's data.

### Unauthenticated Debug Endpoint Exposes Configuration and All User Passwords
- **Severity:** Critical
- **Fix:** Remove debug/diagnostic endpoints from production builds; if kept, require admin authentication and strip secrets from output.
- **Report remediation:** Remove debug endpoints from production builds and gate diagnostics behind admin authentication.
- **Retest:** Fetch /debug unauthenticated — it must return 404, and no build may expose credential material.
