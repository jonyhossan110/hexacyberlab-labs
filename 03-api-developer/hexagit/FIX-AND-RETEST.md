# HexaGit — Fix & Retest (LAB 25)

For every scored test: the secure implementation and a regression check. After fixing, re-run the original exploit — it must fail — then confirm the legitimate workflow still works.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- **Severity:** Critical
- **Fix:** Use parameterised queries everywhere; never build SQL by string concatenation.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("SQL injection login bypass (legacy auth path)") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

### Missing Rate Limiting on Authentication Endpoint
- **Severity:** High
- **Fix:** Add progressive delays, lockout and alerting after repeated failed logins.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Brute force — no rate limit or lockout on login") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

### Username Enumeration via Password Reset
- **Severity:** Medium
- **Fix:** Return one identical, generic response whether or not the account exists.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("User enumeration via password-reset responses") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

### Default Credentials on Service Account
- **Severity:** High
- **Fix:** Force a unique strong password at first use; inventory and rotate all service accounts.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Default credentials on the deploy service account") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

### Predictable Password Reset Token
- **Severity:** High
- **Fix:** Generate reset tokens with a CSPRNG, store only a hash, expire them quickly, single use.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Predictable password-reset token") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

### Client-Side Role Cookie Trusted for Authorization
- **Severity:** Critical
- **Fix:** Determine roles from the server-side session record only; ignore role claims from cookies.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Session/cookie role tampering opens the admin panel") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

## Registration & Profile

### No Minimum Password Strength Enforced
- **Severity:** Medium
- **Fix:** Enforce a minimum length (12+) and block known-breached passwords at registration.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Weak password policy — 1-character passwords accepted") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

### Mass Assignment Allows Admin Role at Registration
- **Severity:** Critical
- **Fix:** Whitelist assignable fields server-side; never accept role/privilege fields from the client.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Mass assignment — role field accepted at registration") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

### Stored Cross-Site Scripting in Display Name
- **Severity:** High
- **Fix:** Escape all user content on output and add a Content-Security-Policy.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Stored XSS in profile display name") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

### Cross-Site Request Forgery on Profile Update
- **Severity:** Medium
- **Fix:** Require a per-session CSRF token (or strict origin checks) on every state-changing request.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("CSRF on profile update (no token, no origin check)") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

## Repositories

### Broken Access Control: Private Repositories Exposed by ID
- **Severity:** Critical
- **Fix:** Check ownership/collaborator rights on every repository read, regardless of how the id was obtained.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Private repository readable by any logged-in user (IDOR)") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

### Missing Ownership Check on Repository Settings
- **Severity:** High
- **Fix:** Authorize settings changes to the repository owner (or repo admins) only.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Repository settings changed by a non-owner") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

### Stored Cross-Site Scripting in Repository Description
- **Severity:** High
- **Fix:** Escape descriptions on output; sanitise any allowed markup with a proven library.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Stored XSS in repository description") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

### Repository Ownership Transfer Without Authorization
- **Severity:** Critical
- **Fix:** Restrict transfers to the current owner, require re-authentication and notify both parties.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Repository transfer executed by a non-owner (transfer hijack)") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

## Branches & Files

### Path Traversal in File Download Exposes Server Files
- **Severity:** High
- **Fix:** Resolve paths against a fixed base directory and reject anything escaping it.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Path traversal in raw file view exposes server config") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

### Protected Branch Accepts Direct Pushes from Non-Owners
- **Severity:** High
- **Fix:** Enforce branch protection server-side: only owners/admins or approved PR merges may write to main.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Direct push to protected main branch by a non-owner") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

## Pull Requests

### Pull Request Self-Approval Permitted
- **Severity:** Medium
- **Fix:** Reject approvals where approver == author; require at least one independent approver.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Author can approve their own pull request (self-approval)") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

### Pull Request Merge Without Required Approvals
- **Severity:** High
- **Fix:** Verify approval count and merger permissions server-side before merging.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Pull request merged with zero approvals") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

## Issues

### Stored Cross-Site Scripting in Issue Tracker
- **Severity:** High
- **Fix:** Escape issue content on output; adopt a strict Content-Security-Policy.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Stored XSS in issue title/body") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

### Missing Authorization on Issue Deletion
- **Severity:** Medium
- **Fix:** Only the issue author, repo owner or moderators may delete an issue; log deletions.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Delete another user's issue (IDOR on issue actions)") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

## Collaborators & Invites

### Collaborator Privilege Escalation (Read → Admin)
- **Severity:** Critical
- **Fix:** Only repo owners/admins may change collaborator roles; verify the caller role server-side.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Read-only collaborator promotes themselves to repo admin") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

### Invitation Acceptance Not Bound to Invitee
- **Severity:** High
- **Fix:** Bind invites to the invitee account/email and require that identity at acceptance.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Repository invite accepted by the wrong user") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

## Tokens & API

### API Token Scope Not Enforced on Write Endpoints
- **Severity:** High
- **Fix:** Check required scopes per endpoint server-side; deny by default.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Read-only API token performs writes (scope not enforced)") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

### Predictable API Token Derived from Username
- **Severity:** Critical
- **Fix:** Issue only random, high-entropy tokens; store hashes; remove all fallback/derived token paths.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("API token derivable from the username (predictable token)") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

## Search

### SQL Injection in Search Exposes Private Repositories
- **Severity:** High
- **Fix:** Parameterise the search query and enforce visibility in the query itself.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("SQL injection in repository search leaks private repos") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.

## Admin Panel

### State-Changing Admin Action via GET (CSRF)
- **Severity:** High
- **Fix:** Make deletions POST-only with CSRF tokens, confirmation and audit logging.
- **Retest:** Repeat the exploit from PRACTICE-GUIDE ("Admin user-deletion performed by a simple GET (CSRF)") and verify it no longer succeeds and the test no longer flips on a fresh progress file; verify the normal user journey for this feature still works.
