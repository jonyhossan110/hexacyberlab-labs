# HexaIdentity — Fix & Retest (LAB 108)

For every test: the secure implementation, and the regression test that proves the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- Secure implementation: Use parameterised queries everywhere and never build SQL by concatenating user input.
- Regression test: re-run the original exploit (POST /login (email field)) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

### Missing Brute-Force Protection on Login (High)
- Secure implementation: Add per-account and per-IP rate limiting, progressive delays and lockout/alerting after repeated failures.
- Regression test: re-run the original exploit (POST /login) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

### Account Enumeration Through Differential Authentication Responses (Medium)
- Secure implementation: Return one generic message ("invalid credentials" / "if the account exists…") for every authentication outcome.
- Regression test: re-run the original exploit (POST /login and POST /forgot) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

### Demo Administrator Credentials Published on Login Page (Critical)
- Secure implementation: Remove demo accounts and printed credentials from production; force unique strong passwords for all privileged accounts.
- Regression test: re-run the original exploit (GET /login (help text on the page) and POST /login) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

### Password Reset Tokens Are Predictable From the User ID (Critical)
- Secure implementation: Generate reset tokens from a CSPRNG (128+ bits), store only a hash, and expire them quickly.
- Regression test: re-run the original exploit (POST /reset) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

### Privilege Escalation via Client-Controlled Role Cookie (High)
- Secure implementation: Store roles only in the server-side session; never trust role claims from cookies or form fields.
- Regression test: re-run the original exploit (GET /admin (role read from a client cookie)) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

## Registration & Profile

### No Minimum Password Strength Enforced at Registration (Medium)
- Secure implementation: Enforce a minimum length of 10–12 characters and screen against known-breached password lists.
- Regression test: re-run the original exploit (POST /register) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

### Mass Assignment Allows Setting Role and Verification Status at Registration (Critical)
- Secure implementation: Whitelist bindable fields per endpoint; set role and verification status only through server-side workflows.
- Regression test: re-run the original exploit (POST /register) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

### Stored Cross-Site Scripting via Display Name (High)
- Secure implementation: Context-encode all user-supplied output and validate names against an allowlist of characters.
- Regression test: re-run the original exploit (POST /register (name field, rendered in admin and profile views)) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

### Missing CSRF Protection on Profile Update (Medium)
- Secure implementation: Require a per-session CSRF token on every state-changing request and validate Origin/Referer as defence in depth.
- Regression test: re-run the original exploit (POST /profile/update) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

## Identity Profiles & Documents

### Insecure Direct Object Reference Exposes Full Identity Records (High)
- Secure implementation: Enforce per-object authorization: a user may only read identity records they own (or staff with a business need).
- Regression test: re-run the original exploit (GET /identity/:id) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

### Unrestricted File Upload Allows Stored HTML/JS on the Portal Origin (High)
- Secure implementation: Allowlist document types, verify content server-side, store uploads outside the web root and serve with Content-Disposition: attachment.
- Regression test: re-run the original exploit (POST /documents/upload and GET /uploads/:name) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

### Path Traversal in Document Download Exposes Arbitrary Files (High)
- Secure implementation: Resolve the requested path, verify it stays inside the documents directory, and serve files by opaque IDs instead of names.
- Regression test: re-run the original exploit (GET /download?file=) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

## Verification Workflow

### Missing Role Check Lets Users Approve Their Own Identity Verification (Critical)
- Secure implementation: Enforce verifier/admin role server-side on every workflow transition and log approvals for audit.
- Regression test: re-run the original exploit (POST /verify/approve) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

### Client-Supplied Verification Status Accepted Without Review (High)
- Secure implementation: Remove client control of status fields; derive status exclusively from the server-side verification workflow.
- Regression test: re-run the original exploit (POST /identity/status) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

### Verification Queue Accessible to Non-Verifier Users (PII Exposure) (High)
- Secure implementation: Apply role middleware to the whole /verify route group and test authorization per route, not per page.
- Regression test: re-run the original exploit (GET /verify/queue) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

## Credentials & Badges

### Users Can Issue Themselves High-Assurance Credentials (High)
- Secure implementation: Bind credential type to completed server-side verification steps; never accept the assurance level from the client.
- Regression test: re-run the original exploit (POST /credentials/issue) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

### Insecure Direct Object Reference on Credential Records (Medium)
- Secure implementation: Check credential ownership (or staff role) on every credential read and use non-sequential public identifiers.
- Regression test: re-run the original exploit (GET /credential/:id) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

## Linked Services

### Linked-Service Tokens Exposed via IDOR (High)
- Secure implementation: Restrict linked-service views to the owner, and never return raw tokens to the client after linking.
- Regression test: re-run the original exploit (GET /services/user/:userId) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

### Missing Ownership Check on Service Unlink (Cross-User Sabotage) (Medium)
- Secure implementation: Verify the link belongs to the session user before unlinking, and require re-authentication for destructive actions.
- Regression test: re-run the original exploit (POST /services/unlink) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

## Account Recovery

### Account Recovery Relies on a Publicly Visible Security Answer (High)
- Secure implementation: Drop knowledge-based recovery; use single-use, expiring reset links sent to the verified email on file.
- Regression test: re-run the original exploit (POST /recover (answer shown on GET /profile/:id)) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

### Password Reset Tokens Are Not Invalidated After Use (High)
- Secure implementation: Invalidate reset tokens on first use and on any password change; keep lifetimes short (minutes, not days).
- Regression test: re-run the original exploit (POST /forgot then POST /reset twice with the same issued token) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

## Admin Panel

### Administrative User Dump (Including Passwords) Exposed to Regular Users (Critical)
- Secure implementation: Require admin role on all /admin endpoints and never store or return plaintext passwords.
- Regression test: re-run the original exploit (GET /admin/users.json) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

### Missing CSRF Protection on Administrative Deactivation (High)
- Secure implementation: Require per-session CSRF tokens on all administrative state changes and enforce SameSite cookies.
- Regression test: re-run the original exploit (POST /admin/deactivate) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

## Platform & API

### Unauthenticated Debug Endpoint Exposes the Entire Identity Dataset (Critical)
- Secure implementation: Remove debug endpoints from production builds; gate any diagnostics behind admin auth and network restrictions.
- Regression test: re-run the original exploit (GET /api/debug (no session)) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.

### API Authentication Token Is a Base64 Encoding of the User Email (High)
- Secure implementation: Issue random, opaque API tokens server-side, store them hashed, and support revocation and rotation.
- Regression test: re-run the original exploit (GET /api/identity?token=) — it must now fail safely (no session, no state change, no data served), while the legitimate flow still works.
