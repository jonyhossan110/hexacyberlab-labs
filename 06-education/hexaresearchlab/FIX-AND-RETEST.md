# HexaResearchLab (LAB 60) — Fix & Retest

For every scored test: the secure implementation, and the regression check that proves the fix. A fix is only done when the original exploit now fails AND the legitimate workflow still works.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- **Severity:** Critical
- **Fix:** Use parametrised queries / prepared statements for all database access, and only authenticate when exactly one row matches.
- **Retest:** Re-run the original exploit (POST /login): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Missing Rate Limiting and Account Lockout on the Login Endpoint
- **Severity:** High
- **Fix:** Add progressive delays and temporary lockout after repeated failures, plus alerting on credential-stuffing patterns.
- **Retest:** Re-run the original exploit (POST /login): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### User Enumeration Through Differential Password-Reset Responses
- **Severity:** Medium
- **Fix:** Return one generic response for every reset request, regardless of whether the account exists.
- **Retest:** Re-run the original exploit (POST /forgot-password): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Default/Demo Credentials Active on the Production Portal
- **Severity:** High
- **Fix:** Remove demo accounts from production, or force unique passwords and disable them by default.
- **Retest:** Re-run the original exploit (POST /login (demo account)): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Password-Reset Tokens Are Predictable (Derived From the Email Address)
- **Severity:** Critical
- **Fix:** Generate reset tokens with a CSPRNG (at least 128 bits), store only a hash, expire them quickly and make them single-use.
- **Retest:** Re-run the original exploit (POST /reset-password): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Client-Controlled Role Cookie Trusted for Authorisation (Editor Console)
- **Severity:** High
- **Fix:** Derive roles only from the server-side session record; never trust client-supplied role claims.
- **Retest:** Re-run the original exploit (GET /editor): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

## Registration & Profile

### Mass Assignment in Registration Allows Privilege Escalation
- **Severity:** High
- **Fix:** Bind only whitelisted fields on registration; assign roles server-side, never from request input.
- **Retest:** Re-run the original exploit (POST /register): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Weak Password Policy on Registration
- **Severity:** Medium
- **Fix:** Enforce a minimum length of at least 10 characters and screen new passwords against known-breached lists.
- **Retest:** Re-run the original exploit (POST /register): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Stored Cross-Site Scripting via Display Name
- **Severity:** High
- **Fix:** Context-encode all user-supplied output and validate display names against an allow-list pattern.
- **Retest:** Re-run the original exploit (POST /register, POST /profile/update): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Cross-Site Request Forgery on Profile Update
- **Severity:** Medium
- **Fix:** Require and verify an unpredictable CSRF token on every state-changing request, and validate Origin/Referer.
- **Retest:** Re-run the original exploit (POST /profile/update): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

## Paper Submissions

### Insecure Direct Object Reference Exposes Other Authors’ Papers
- **Severity:** High
- **Fix:** Check authorisation (owner, assigned reviewer, or editor) on every paper access.
- **Retest:** Re-run the original exploit (GET /papers/:id): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Manuscript Download Missing Authorisation (IDOR)
- **Severity:** High
- **Fix:** Enforce the same ownership/assignment check on file downloads as on the paper page.
- **Retest:** Re-run the original exploit (GET /papers/:id/manuscript): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Unrestricted File Upload Allows Stored HTML/JS Under the Portal Origin
- **Severity:** High
- **Fix:** Allow-list file types, store uploads outside the web root or on a separate domain, and serve them with a safe Content-Type and Content-Disposition.
- **Retest:** Re-run the original exploit (POST /papers/:id/upload, GET /files/:name): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Path Traversal in File Download Endpoint
- **Severity:** High
- **Fix:** Resolve the requested path and verify it stays inside the intended directory; reject traversal sequences outright.
- **Retest:** Re-run the original exploit (GET /download?file=): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

## Peer Review

### Broken Access Control Allows Reviews From Unassigned Users
- **Severity:** High
- **Fix:** Verify reviewer assignment server-side before accepting any review.
- **Retest:** Re-run the original exploit (POST /papers/:id/reviews): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Insecure Direct Object Reference Allows Editing Other Reviewers’ Scores
- **Severity:** Medium
- **Fix:** Check that the session user owns the review before allowing score changes.
- **Retest:** Re-run the original exploit (POST /reviews/:id/score): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Reviewer Identities Exposed to Authors, Breaking Double-Blind Review
- **Severity:** High
- **Fix:** Return anonymised reviewer labels to authors; expose identities only to editors.
- **Retest:** Re-run the original exploit (GET /api/papers/:id/reviews): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Missing Authorisation on Reviewer Assignment Enables Self-Review
- **Severity:** High
- **Fix:** Restrict assignment to editors and block conflicts of interest (an author can never review their own paper).
- **Retest:** Re-run the original exploit (POST /papers/:id/assign): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Broken Access Control on the Editorial Decision Endpoint
- **Severity:** Critical
- **Fix:** Require the editor role server-side for all decision actions and keep an audit log of decisions.
- **Retest:** Re-run the original exploit (POST /papers/:id/decide): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Invitation Acceptance Does Not Verify the Invitee (IDOR)
- **Severity:** Medium
- **Fix:** Bind invitations to the invited account with an unguessable token and verify the acceptor matches.
- **Retest:** Re-run the original exploit (POST /invitations/:id/accept): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

## Search

### SQL Injection in Paper Search
- **Severity:** High
- **Fix:** Use parametrised queries for search and never interpolate user input into SQL.
- **Retest:** Re-run the original exploit (GET /search?q=): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Reflected Cross-Site Scripting in Search
- **Severity:** Medium
- **Fix:** Encode the reflected search term in the correct (HTML) output context.
- **Retest:** Re-run the original exploit (GET /search?q=): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

## Admin Panel

### Broken Access Control Exposes the Admin Console to All Authenticated Users
- **Severity:** Critical
- **Fix:** Enforce role checks (admin only) on every admin route, server-side.
- **Retest:** Re-run the original exploit (GET /admin): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Cross-Site Request Forgery on Admin Role Management
- **Severity:** High
- **Fix:** Verify CSRF tokens on all admin actions and require re-authentication for role changes.
- **Retest:** Re-run the original exploit (POST /admin/users/:id/role): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

## Platform & API

### Predictable API Credentials (Base64 of Email) Accepted
- **Severity:** High
- **Fix:** Issue high-entropy API keys, store them hashed, and remove legacy credential fallbacks.
- **Retest:** Re-run the original exploit (GET /api/papers (X-Api-Key header)): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.

### Debug Endpoint Exposes All User Accounts and Plaintext Passwords
- **Severity:** Critical
- **Fix:** Remove debug endpoints from production and hash passwords with a modern password hashing function.
- **Retest:** Re-run the original exploit (GET /api/debug): it must now fail (access denied / generic response / no state change), the lab test must stay unpassed on a fresh run, and the normal user journey for this feature must still complete successfully.
