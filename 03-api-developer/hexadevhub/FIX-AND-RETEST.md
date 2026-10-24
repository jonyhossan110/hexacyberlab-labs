# HexaDevHub — Fix & Retest (LAB 22)

For every scored test: the secure implementation, and the regression check that proves the fix. Retest method: repeat the original exploit after the fix — it must fail — then confirm the legitimate workflow still works.

## Login & Authentication

### SQL Injection in Login (Authentication Bypass) (Critical)
- **Secure implementation:** Use parameterised queries / prepared statements for the login lookup; never concatenate user input into SQL.
- **Regression test:** Re-run the exploit for "SQL injection login bypass" — it must no longer register an effect; then perform the normal Login & Authentication workflow as a legitimate user and confirm it still succeeds end to end.

### Missing Brute-Force Protection on Login (High)
- **Secure implementation:** Add per-account and per-IP rate limiting, progressive delays, and lockout/alerting after repeated failures.
- **Regression test:** Re-run the exploit for "Brute force — no rate limiting or lockout" — it must no longer register an effect; then perform the normal Login & Authentication workflow as a legitimate user and confirm it still succeeds end to end.

### Account Enumeration via Differential Responses (Medium)
- **Secure implementation:** Return one generic message ("if that account exists…") for login failures and reset requests.
- **Regression test:** Re-run the exploit for "User enumeration via login & reset responses" — it must no longer register an effect; then perform the normal Login & Authentication workflow as a legitimate user and confirm it still succeeds end to end.

### Default/Demo Credentials Enabled (High)
- **Secure implementation:** Disable seeded demo accounts in production and force unique, strong passwords at first login.
- **Regression test:** Re-run the exploit for "Weak default demo credentials" — it must no longer register an effect; then perform the normal Login & Authentication workflow as a legitimate user and confirm it still succeeds end to end.

### Predictable Password Reset Token (High)
- **Secure implementation:** Generate reset tokens from a CSPRNG (at least 128 bits), store them hashed, single-use, with a short expiry.
- **Regression test:** Re-run the exploit for "Predictable password-reset token" — it must no longer register an effect; then perform the normal Login & Authentication workflow as a legitimate user and confirm it still succeeds end to end.

### Client-Side Role Cookie Trusted for Authorisation (Privilege Escalation) (Critical)
- **Secure implementation:** Store roles only in the server-side session record; never accept role claims from client-controlled cookies.
- **Regression test:** Re-run the exploit for "Session role trusted from a client cookie (hx_role)" — it must no longer register an effect; then perform the normal Login & Authentication workflow as a legitimate user and confirm it still succeeds end to end.

## Registration & Profile

### Weak Password Policy on Registration (Medium)
- **Secure implementation:** Enforce a minimum length (12+) and block common/breached passwords server-side at registration and reset.
- **Regression test:** Re-run the exploit for "Weak password policy (1-character passwords accepted)" — it must no longer register an effect; then perform the normal Registration & Profile workflow as a legitimate user and confirm it still succeeds end to end.

### Mass Assignment Allows Privilege Escalation at Registration (Critical)
- **Secure implementation:** Whitelist the exact fields registration may set; assign roles server-side only.
- **Regression test:** Re-run the exploit for "Mass assignment — role set at registration" — it must no longer register an effect; then perform the normal Registration & Profile workflow as a legitimate user and confirm it still succeeds end to end.

### Stored Cross-Site Scripting via Display Name (High)
- **Secure implementation:** Output-encode all user data at render time and add a restrictive Content-Security-Policy.
- **Regression test:** Re-run the exploit for "Stored XSS in display name (team roster)" — it must no longer register an effect; then perform the normal Registration & Profile workflow as a legitimate user and confirm it still succeeds end to end.

### Cross-Site Request Forgery on Profile Update (Medium)
- **Secure implementation:** Require per-session anti-CSRF tokens on all state-changing requests and validate Origin/Referer.
- **Regression test:** Re-run the exploit for "CSRF on profile update" — it must no longer register an effect; then perform the normal Registration & Profile workflow as a legitimate user and confirm it still succeeds end to end.

## Projects

### Broken Object Level Authorisation — Private Project Readable by IDOR (High)
- **Secure implementation:** Check project membership/ownership on every project read and return 404 for non-members.
- **Regression test:** Re-run the exploit for "Private project readable by any account (IDOR)" — it must no longer register an effect; then perform the normal Projects workflow as a legitimate user and confirm it still succeeds end to end.

### Broken Object Level Authorisation — Project Settings Writable by Non-Members (High)
- **Secure implementation:** Enforce ownership/membership checks on all project mutations, server-side.
- **Regression test:** Re-run the exploit for "Project settings tampered by a non-member (write IDOR)" — it must no longer register an effect; then perform the normal Projects workflow as a legitimate user and confirm it still succeeds end to end.

## API Tokens

### Live API Credential Exposed in Public Documentation (Critical)
- **Secure implementation:** Use placeholder tokens in all examples, scan published docs for secrets, and rotate any token ever printed.
- **Regression test:** Re-run the exploit for "Live API token printed inside public docs quickstart" — it must no longer register an effect; then perform the normal API Tokens workflow as a legitimate user and confirm it still succeeds end to end.

### API Token Scope Not Enforced (Read Token Performs Writes) (High)
- **Secure implementation:** Enforce token scope on every API endpoint (read vs write vs admin) before processing the request.
- **Regression test:** Re-run the exploit for "Read-only token can write (scope not enforced)" — it must no longer register an effect; then perform the normal API Tokens workflow as a legitimate user and confirm it still succeeds end to end.

### Broken Object Level Authorisation — Token Revocation (High)
- **Secure implementation:** Scope all token operations to projects the caller owns or administers.
- **Regression test:** Re-run the exploit for "Any user can revoke another project’s tokens (IDOR)" — it must no longer register an effect; then perform the normal API Tokens workflow as a legitimate user and confirm it still succeeds end to end.

### Forgeable API Token Derived from Public Identifiers (Critical)
- **Secure implementation:** Retire the legacy token format; issue only random tokens of at least 128 bits and store them hashed.
- **Regression test:** Re-run the exploit for "Forgeable legacy API token (derived from public ids)" — it must no longer register an effect; then perform the normal API Tokens workflow as a legitimate user and confirm it still succeeds end to end.

## Documentation

### Stored Cross-Site Scripting in Documentation Pages (High)
- **Secure implementation:** Sanitise stored docs HTML with an allowlist sanitizer and serve docs with a restrictive CSP.
- **Regression test:** Re-run the exploit for "Stored XSS in documentation page content" — it must no longer register an effect; then perform the normal Documentation workflow as a legitimate user and confirm it still succeeds end to end.

### Broken Object Level Authorisation — Docs Page Editing (High)
- **Secure implementation:** Check project membership on every docs write; log content changes with authorship.
- **Regression test:** Re-run the exploit for "Documentation of another project editable (IDOR)" — it must no longer register an effect; then perform the normal Documentation workflow as a legitimate user and confirm it still succeeds end to end.

### Private Documentation Exposed Without Authentication (High)
- **Secure implementation:** Require authentication and project membership for docs of non-public projects.
- **Regression test:** Re-run the exploit for "Private project documentation served without login" — it must no longer register an effect; then perform the normal Documentation workflow as a legitimate user and confirm it still succeeds end to end.

## Team Invites

### Team Invite Not Bound to Invited Email (High)
- **Secure implementation:** Bind invites to the invited email address and require the accepting account to match it.
- **Regression test:** Re-run the exploit for "Invite link accepted by the wrong account" — it must no longer register an effect; then perform the normal Team Invites workflow as a legitimate user and confirm it still succeeds end to end.

### Team Invite Replay (Token Never Invalidated) (Medium)
- **Secure implementation:** Mark invites used on acceptance, expire them quickly, and alert owners on each join.
- **Regression test:** Re-run the exploit for "Invite link reusable (never marked used)" — it must no longer register an effect; then perform the normal Team Invites workflow as a legitimate user and confirm it still succeeds end to end.

### Privilege Escalation via Invite Role Override (Critical)
- **Secure implementation:** Grant exactly the role stored on the invite; ignore any role supplied by the client.
- **Regression test:** Re-run the exploit for "Invite acceptance lets the guest choose their own role" — it must no longer register an effect; then perform the normal Team Invites workflow as a legitimate user and confirm it still succeeds end to end.

## Usage & API

### Broken Object Level Authorization in Project Stats API (High)
- **Secure implementation:** Authorise the token’s project against the path project id on every API request.
- **Regression test:** Re-run the exploit for "API returns another project’s stats (BOLA)" — it must no longer register an effect; then perform the normal Usage & API workflow as a legitimate user and confirm it still succeeds end to end.

### Broken Object Level Authorisation — Usage Dashboard (Medium)
- **Secure implementation:** Restrict dashboards to project members and audit access to usage data.
- **Regression test:** Re-run the exploit for "Usage dashboard of another project viewable (IDOR)" — it must no longer register an effect; then perform the normal Usage & API workflow as a legitimate user and confirm it still succeeds end to end.

## Platform & Admin

### Sensitive Data Exposure via Unauthenticated Debug Endpoint (Critical)
- **Secure implementation:** Remove debug endpoints from production builds; require admin auth and redact secrets anywhere diagnostics remain.
- **Regression test:** Re-run the exploit for "Debug endpoint dumps users, tokens and config" — it must no longer register an effect; then perform the normal Platform & Admin workflow as a legitimate user and confirm it still succeeds end to end.
