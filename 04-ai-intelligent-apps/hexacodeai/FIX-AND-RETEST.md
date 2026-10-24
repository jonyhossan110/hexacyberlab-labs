# HexaCodeAI — Fix & Retest

For every scored test: the secure implementation, and the regression check that proves the fix (repeat the original exploit — it must now fail — while the legitimate flow still works).

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- **Fix:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Retest:** repeat the exploit for "SQL Injection Login Bypass" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

### Missing Rate Limiting / Account Lockout on Authentication Endpoint (High)
- **Fix:** Add progressive delays, lockout and alerting after repeated failed logins per account and IP.
- **Retest:** repeat the exploit for "No Brute-Force Protection on Login" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

### User Enumeration Through Divergent Forgot-Password Responses (Medium)
- **Fix:** Return one identical, generic response whether or not the account exists.
- **Retest:** repeat the exploit for "Account Enumeration via Forgot Password" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

### Default Demo Account With Weak Known Password Enabled (High)
- **Fix:** Remove demo/default accounts before production and force unique strong passwords on seeded accounts.
- **Retest:** repeat the exploit for "Default Demo Credentials Still Active" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

### Password Reset Tokens Are Predictable (Derived From User ID and Time) (High)
- **Fix:** Generate reset tokens from a CSPRNG (≥128 bits), store hashed, expire within 30–60 minutes, single use.
- **Retest:** repeat the exploit for "Predictable Password-Reset Token" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

### Authorization Role Trusted From a Client-Controlled Cookie (High)
- **Fix:** Keep role/permission data server-side in the session; never trust client-supplied role values.
- **Retest:** repeat the exploit for "Role Stored in a Client Cookie (Tampering)" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

## Registration & Profile

### Absent Password Policy Allows Trivially Weak Passwords (Medium)
- **Fix:** Enforce a minimum length (≥10) and block known-breached passwords at registration and reset.
- **Retest:** repeat the exploit for "No Minimum Password Strength" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

### Mass Assignment on Registration Allows Privilege / Plan Escalation (High)
- **Fix:** Whitelist assignable fields per endpoint; never bind role/plan/balance fields from user input.
- **Retest:** repeat the exploit for "Mass Assignment — Role & Plan From the Form" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

### Stored Cross-Site Scripting via Display Name (High)
- **Fix:** Context-encode all user-supplied output and add a Content-Security-Policy as defence in depth.
- **Retest:** repeat the exploit for "Stored XSS in Display Name" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

### Missing CSRF Protection on Profile Update (Medium)
- **Fix:** Require unpredictable per-session CSRF tokens on all state-changing requests and validate Origin/Referer.
- **Retest:** repeat the exploit for "CSRF on Profile Update" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

## Repositories

### Insecure Direct Object Reference Exposes Private Repositories (High)
- **Fix:** Enforce per-object authorization (owner/workspace membership) on every repository access.
- **Retest:** repeat the exploit for "Private Repository IDOR" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

### Missing Authorization on Repository Deletion Allows Cross-User Destruction (High)
- **Fix:** Verify ownership (or workspace owner role) before any delete; log destructive actions.
- **Retest:** repeat the exploit for "Delete Another User’s Repository" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

### Broken Object Level Authorization in Repository API (High)
- **Fix:** Apply identical ownership checks in API handlers; return 404 for objects the caller may not see.
- **Retest:** repeat the exploit for "API Returns Private Repos (BOLA)" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

## Search & Snippets

### Reflected Cross-Site Scripting in Search Results (Medium)
- **Fix:** Encode all reflected input on output; validate and length-limit search terms.
- **Retest:** repeat the exploit for "Reflected XSS in Search" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

### Search Index Ignores Visibility — Private Code Leaks Across Accounts (High)
- **Fix:** Filter search results by the caller’s access rights at query time; index visibility with the document.
- **Retest:** repeat the exploit for "Search Leaks Private Code of Other Users" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

### Insecure Direct Object Reference Exposes Private Snippets (High)
- **Fix:** Check snippet ownership/sharing on every read; use unguessable IDs for shared objects.
- **Retest:** repeat the exploit for "Private Snippet IDOR" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

### Predictable Share Tokens Serve Private Snippets to Non-Owners (High)
- **Fix:** Use long random share tokens, honour the item’s private flag, and allow owners to revoke links.
- **Retest:** repeat the exploit for "Guessable Snippet Share Links" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

## Patches & Approvals

### Patch Detail Page Missing Workspace Authorization (Private Code Disclosure) (High)
- **Fix:** Authorize patch access through the parent repository’s ownership/workspace rules.
- **Retest:** repeat the exploit for "Patch From a Private Repo Leaks to Outsiders" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

### Patch Approval Endpoint Allows Self-Approval / Unauthorized Approval (High)
- **Fix:** Enforce approver rules server-side: repo/workspace owner only, never the patch author.
- **Retest:** repeat the exploit for "Patch Approval Bypass — Author Approves Own Patch" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

### Prompt Injection in Code Comments Manipulates the AI Patch Reviewer (High)
- **Fix:** Treat submitted code as data, never instructions; keep human approval mandatory and separate the reviewer’s system prompt from content.
- **Retest:** repeat the exploit for "Prompt Injection via Code Comment Approves the Patch" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

## Workspaces & Teams

### Missing Tenant Isolation on Workspace Pages (High)
- **Fix:** Verify workspace membership server-side on every workspace-scoped route.
- **Retest:** repeat the exploit for "Workspace Cross-Access (Non-Member)" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

### Workspace Role Management Allows Self-Promotion to Owner (Critical)
- **Fix:** Only workspace owners may change roles; never allow granting a role above the caller’s own.
- **Retest:** repeat the exploit for "Member Promotes Self to Workspace Owner" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

## Usage & Quotas

### Client-Supplied Plan/Credit Fields Bypass Usage Quotas (High)
- **Fix:** Ignore plan/credit fields in requests; derive entitlements from the server-side account record only.
- **Retest:** repeat the exploit for "Quota / Plan Tampering in Generation Request" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

## Platform & API

### API Tokens Are Deterministically Derived From Email Addresses (Critical)
- **Fix:** Issue random, opaque API tokens (CSPRNG), store hashed, and support rotation/revocation.
- **Retest:** repeat the exploit for "Predictable API Token (Derived From Email)" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.

### Exposed Debug Endpoint Discloses All User Credentials (Critical)
- **Fix:** Remove debug endpoints from production builds; protect any diagnostics behind admin auth and IP allowlists.
- **Retest:** repeat the exploit for "Debug Endpoint Dumps All Users & Passwords" exactly as in the Practice Guide. Expected after the fix: the attempt is blocked/denied or the payload is neutralised, the test can no longer be triggered by that route, and normal users can still complete the same business flow.
