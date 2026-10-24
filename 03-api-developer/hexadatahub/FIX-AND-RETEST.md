# HexaDataHub — Fix & Retest (LAB 28)

For every scored test: how the finding appears in a real pentest report, the secure implementation, and the regression retest that proves the fix.

## Login & Authentication

### SQL Injection in Login Form
- **Severity:** Critical
- **Secure implementation / remediation:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("SQL Injection — Login Bypass"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

### No Brute-Force Protection on Login
- **Severity:** High
- **Secure implementation / remediation:** Add per-account and per-IP rate limiting, progressive delays / lockout, and MFA.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Brute Force — No Rate Limit or Lockout"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

### Account Enumeration via Authentication Responses
- **Severity:** Medium
- **Secure implementation / remediation:** Return one generic message ("Invalid email or password") for all authentication failures.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("User Enumeration via Error Messages"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

### Active Default / Demo Credentials
- **Severity:** High
- **Secure implementation / remediation:** Remove demo accounts from production, force unique credentials, and rotate any vendor defaults.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Default Demo Credentials Still Active"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

### Predictable Password Reset Token
- **Severity:** Critical
- **Secure implementation / remediation:** Generate reset tokens with a CSPRNG, store them hashed, expire them quickly, and bind them to a single use.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Predictable Password-Reset Token"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

### Unsigned Session Cookie Allows Role Forgery
- **Severity:** Critical
- **Secure implementation / remediation:** Sign session tokens (HMAC) or keep session state server-side; always re-check roles from the server-side account record.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Session Cookie Tampering — Role Forgery"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

## Registration & Profile

### No Password Policy on Registration
- **Severity:** Medium
- **Secure implementation / remediation:** Enforce a minimum length (12+), screen against known-breached passwords, and offer MFA.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Weak Password Policy at Registration"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

### Mass Assignment in Registration Allows Admin Creation
- **Severity:** Critical
- **Secure implementation / remediation:** Allow-list exactly the fields each endpoint may set; never bind privileged fields from request input.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Mass Assignment — Self-Made Admin"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

### Stored Cross-Site Scripting via Display Name
- **Severity:** High
- **Secure implementation / remediation:** Context-encode all user-controlled output and validate input; deploy a restrictive Content-Security-Policy.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Stored XSS in Display Name"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

### Missing CSRF Protection on Profile Update
- **Severity:** High
- **Secure implementation / remediation:** Require unpredictable per-session CSRF tokens on all state-changing requests and verify Origin/Referer.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("CSRF on Profile Update"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

## Workspaces & Members

### Broken Access Control on Workspace Pages (IDOR)
- **Severity:** High
- **Secure implementation / remediation:** Verify tenant membership server-side for every workspace-scoped route and object.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Cross-Workspace IDOR — Rival Workspace Settings"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

### Guessable, Unbound Workspace Invite Tokens
- **Severity:** High
- **Secure implementation / remediation:** Use random, expiring invite tokens bound to the invited email address; require acceptance by that account.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Invite Link Abuse — Sequential Tokens, No Email Binding"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

## Datasets

### Broken Object-Level Authorisation on Dataset View (IDOR)
- **Severity:** Critical
- **Secure implementation / remediation:** Scope every dataset query by the caller’s workspace membership; return 404 for objects outside it.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Cross-Workspace Dataset IDOR"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

### Missing Authorisation on Dataset Rename (Write IDOR)
- **Severity:** High
- **Secure implementation / remediation:** Enforce the same membership/ownership checks on mutating endpoints as on reads; log cross-tenant attempts.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Dataset Rename by Non-Member"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

### Missing Authorisation on Dataset Deletion
- **Severity:** Critical
- **Secure implementation / remediation:** Restrict deletion to dataset/workspace owners, add confirmation, soft-delete and an audit log.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Dataset Deletion by Outsider"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

## Imports

### CSV / Formula Injection in Imported Data
- **Severity:** High
- **Secure implementation / remediation:** Neutralise cells starting with =, +, -, @ (and tab/CR) on import and export by prefixing a single quote.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("CSV Formula Injection via Import"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

### Path Traversal in File Import
- **Severity:** Critical
- **Secure implementation / remediation:** Resolve the final path and verify it stays inside the allowed directory; reject .. and absolute paths.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Import Path Traversal — Reading Server Files"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

### XML External Entity Injection in Import
- **Severity:** Critical
- **Secure implementation / remediation:** Disable DTD processing / external entities in the XML parser, or reject DOCTYPE declarations outright.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("XML External Entity (XXE) in Dataset Import"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

## Exports & API

### Broken Access Control on Dataset Export (Bulk IDOR)
- **Severity:** Critical
- **Secure implementation / remediation:** Apply the same tenant scoping to exports as to views; audit and alert on bulk downloads.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Cross-Workspace Dataset Export"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

### Predictable API Keys Derived from Email Addresses
- **Severity:** Critical
- **Secure implementation / remediation:** Generate API keys from a CSPRNG, store only hashes, and support rotation and revocation.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Predictable API Key — Derived from Email"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

### Broken Object-Level Authorisation in API (BOLA)
- **Severity:** Critical
- **Secure implementation / remediation:** Ignore client-supplied tenant IDs or verify membership for each; scope queries by the authenticated key’s workspaces.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("API Broken Object-Level Authorisation — Workspace Parameter"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

## Sharing

### Predictable Share-Link Tokens Expose All Datasets
- **Severity:** High
- **Secure implementation / remediation:** Use long random tokens for share links, remove ID-based aliases, and let owners revoke links.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Guessable Public Share Links"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

### No Rate Limiting on Share-Link Resolution
- **Severity:** Medium
- **Secure implementation / remediation:** Rate-limit token resolution per IP, return uniform 404s, and alert on probing patterns.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Share-Link Enumeration — No Rate Limit"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

## Search

### Reflected Cross-Site Scripting in Search
- **Severity:** High
- **Secure implementation / remediation:** Context-encode all reflected values and validate search input.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Reflected XSS in Dataset Search"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

## Admin & Platform

### Missing CSRF Protection on Admin Actions
- **Severity:** High
- **Secure implementation / remediation:** Require CSRF tokens and same-site cookies for all admin state changes; re-confirm destructive actions.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("CSRF on Admin User Deletion"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.

### Unauthenticated Debug Endpoint Discloses Credentials
- **Severity:** Critical
- **Secure implementation / remediation:** Remove debug endpoints from production builds; gate diagnostics behind admin auth and network restrictions.
- **Regression retest:** Re-run the original exploit exactly as described in PRACTICE-GUIDE.md ("Debug Endpoint Exposes All Users and Passwords"). After the fix it must fail safely (access denied / generic error / payload encoded), while the legitimate feature keeps working for authorised users.
