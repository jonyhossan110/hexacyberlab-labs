# HexaWorkspace — Fix & Retest Guide (25 findings)

For every scored test: the secure implementation, and the exact retest that proves the fix. Method: apply the fix in a copy of the lab, re-run the original exploit — it must now fail — and confirm the legitimate flow still works.

## Login & Authentication

### SQL Injection Login Bypass (Critical)
- **Finding:** SQL Injection in Login Form Allows Authentication Bypass
- **Fix:** Use parameterised queries / prepared statements for all database access; never build queries by string concatenation.
- **Retest:** repeat the original exploit (POST /login (string-built user lookup)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

### Brute Force — No Rate Limiting or Lockout (High)
- **Finding:** Missing Brute-Force Protection on Login
- **Fix:** Rate-limit login attempts per account and per IP, add progressive delays / lockout and alerting on repeated failures.
- **Retest:** repeat the original exploit (POST /login) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

### User Enumeration via Login & Forgot-Password Responses (Medium)
- **Finding:** Account Enumeration via Distinct Authentication Error Messages
- **Fix:** Return one generic message ("Invalid email or password") for all failed logins and password-reset requests.
- **Retest:** repeat the original exploit (POST /login + POST /forgot) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

### Weak / Default Credentials — Demo Guest Account (High)
- **Finding:** Active Default/Demo Account with Weak Password
- **Fix:** Remove or disable demo/default accounts before production; enforce unique, strong credentials for every account.
- **Retest:** repeat the original exploit (Seeded guest account + POST /login) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

### Predictable Password-Reset Token (Critical)
- **Finding:** Predictable Password Reset Token Allows Account Takeover
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), store them hashed, expire them quickly and make them single-use.
- **Retest:** repeat the original exploit (POST /reset (token = rst-<id>-<id*137+42>)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

### Session Role Cookie Tampering (Critical)
- **Finding:** Privilege Escalation via Unsigned Role Cookie
- **Fix:** Keep roles in server-side session state; never trust client-supplied role claims. If a token must carry claims, sign and verify it (e.g. HMAC/JWT with server secret).
- **Retest:** repeat the original exploit (hws_role cookie, trusted by GET /admin) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

## Registration & Profile

### Mass Assignment — Privileged Fields Accepted from the Form (Critical)
- **Finding:** Mass Assignment Allows Privilege Escalation to Site Admin
- **Fix:** Allowlist bindable fields per endpoint; never bind role/permission fields from request data.
- **Retest:** repeat the original exploit (POST /profile + POST /register (unfiltered field binding)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

### Stored XSS in Display Name (High)
- **Finding:** Stored Cross-Site Scripting via Display Name
- **Fix:** Context-appropriate output encoding for all user-supplied content; add a Content-Security-Policy as defence in depth.
- **Retest:** repeat the original exploit (Display name rendered raw in header + /workspace/:id/members) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

### Weak Password Policy — 1-Character Passwords Accepted (Medium)
- **Finding:** Missing Password Complexity / Length Policy
- **Fix:** Enforce a minimum length (≥10) and screen against known-breached password lists at registration and reset.
- **Retest:** repeat the original exploit (POST /register (no length/complexity check)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

### CSRF on Profile Update (Medium)
- **Finding:** Cross-Site Request Forgery on Profile Update (Token Not Verified)
- **Fix:** Verify the CSRF token server-side on every state-changing request and enforce SameSite cookies.
- **Retest:** repeat the original exploit (POST /profile (hx_tok rendered, never verified)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

## Workspaces & Members

### IDOR — Another Workspace’s Member List Exposed (High)
- **Finding:** Insecure Direct Object Reference on Workspace Member List
- **Fix:** Check workspace membership (or an explicit grant) on every workspace-scoped endpoint, not just authentication.
- **Retest:** repeat the original exploit (GET /workspace/:id/members (no membership check)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

### Role Tampering — a Viewer Can Demote or Remove the Owner (High)
- **Finding:** Missing Authorization on Member Role Change / Removal
- **Fix:** Require workspace-owner role (verified server-side) for role changes and removals; protect the owner record from demotion.
- **Retest:** repeat the original exploit (POST /workspace/:id/members/role + /remove (no owner check)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

## Files & Permissions

### IDOR — Private File of Another Team Served by ID (Critical)
- **Finding:** Insecure Direct Object Reference on File View
- **Fix:** Authorize each file read against workspace membership or an explicit per-file grant.
- **Retest:** repeat the original exploit (GET /files/:id (login check only)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

### Permission Bypass — Viewer Edits a File (High)
- **Finding:** Missing Role Check on File Edit Endpoint
- **Fix:** Enforce editor-or-above role server-side on all file mutation endpoints.
- **Retest:** repeat the original exploit (POST /files/:id/edit (membership checked, role not checked)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

### Permission Bypass — Viewer Deletes a File (High)
- **Finding:** Missing Role Check on File Delete Endpoint
- **Fix:** Enforce editor-or-above (ideally owner) server-side for deletion; consider soft-delete with recovery.
- **Retest:** repeat the original exploit (POST /files/:id/delete (membership checked, role not checked)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

### Folder Path Traversal — Reading Another Team’s Files by Path (Critical)
- **Finding:** Path Traversal in File Download Allows Cross-Tenant File Access
- **Fix:** Resolve the canonical path and verify it stays inside the requester’s authorised root; reject ".." outright.
- **Retest:** repeat the original exploit (GET /raw?path= (naive ".." resolution)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

### Sharing Grant Created Without Authority (High)
- **Finding:** Missing Authorization on File Sharing Grant Creation
- **Fix:** Require owner/editor role on the file’s workspace to create grants; log grant creation for audit.
- **Retest:** repeat the original exploit (POST /files/:id/share (no authority check)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

## Comments

### Stored XSS in File Comments (High)
- **Finding:** Stored Cross-Site Scripting in Comments
- **Fix:** Escape all comment content on render; sanitise if rich text is ever allowed; add CSP.
- **Retest:** repeat the original exploit (Comment body rendered raw on GET /files/:id) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

### IDOR — Deleting Another User's Comment (Medium)
- **Finding:** Missing Ownership Check on Comment Deletion
- **Fix:** Allow deletion only by the comment author, workspace owner, or a site admin — verified server-side.
- **Retest:** repeat the original exploit (POST /comments/:id/delete (no ownership check)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

## Share Links

### Revoked Share Link Keeps Working (High)
- **Finding:** Revoked Share Links Remain Active
- **Fix:** Check the revoked flag (and expiry) on every share-link access; deny revoked tokens.
- **Retest:** repeat the original exploit (GET /s/:token (revoked flag never consulted)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

### Predictable, Enumerable Share-Link Tokens (High)
- **Finding:** Guessable Share-Link Tokens Allow Enumeration of Shared Files
- **Fix:** Generate share tokens with a CSPRNG (≥128 bits of entropy); rate-limit token lookups.
- **Retest:** repeat the original exploit (GET /s/:token (sequential tokens shr-1001, shr-1002, ...)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

## File Upload

### Unrestricted Upload — HTML File Served as a Web Page (High)
- **Finding:** Unrestricted File Upload Leads to Stored XSS / Content Spoofing
- **Fix:** Allowlist file types, verify content, serve uploads as attachments or from a separate sandbox domain with safe content types.
- **Retest:** repeat the original exploit (POST /upload + GET /uploads/:name (content type from extension)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

## Admin Panel

### CSRF — Admin User Deletion via a GET Link (High)
- **Finding:** State-Changing GET Request Allows CSRF Account Deletion
- **Fix:** Make destructive actions POST-only with a verified CSRF token and re-authentication for critical operations.
- **Retest:** repeat the original exploit (GET /admin/users/:id/delete (state change via GET, no token)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

## Platform & API

### Sensitive Data Exposure — /api/users Full Dump (Critical)
- **Finding:** Unauthenticated API Endpoint Exposes All User Credentials
- **Fix:** Require authentication and admin authorization on user-listing APIs; never return password material in API responses.
- **Retest:** repeat the original exploit (GET /api/users (no authentication)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.

### Predictable API Token — Cross-Account API Access (Critical)
- **Finding:** Predictable API Tokens Allow Cross-Account Data Access
- **Fix:** Issue API tokens from a CSPRNG with ≥128 bits of entropy; show them once, store hashed, and scope them per account.
- **Retest:** repeat the original exploit (GET /api/files?token= (token = hw-<1000+userId>)) — it must be denied, and the test must stay incomplete on a fresh progress state; then verify the normal user flow for this feature still succeeds.
