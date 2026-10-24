# HexaSaaS — Fix & Retest Guide (LAB 11)

For every scored test: the secure fix, and the regression check that proves the fix holds. Work in a COPY of the lab — the practice lab itself must stay vulnerable. The retest passes when the original exploit no longer produces its effect **and** the legitimate flow still works.

## Login & Authentication

### 1. SQL Injection — Legacy SSO Login Bypass (A03 Injection)
- **Report title:** SQL Injection in Legacy SSO Login Endpoint — Severity: Critical
- **Secure fix:** Use parameterised queries on every authentication path; remove or rewrite legacy endpoints; add injection regression tests for all login routes.
- **Regression check:** Replay the bypass payloads against the legacy route: every one returns the generic invalid-credentials response; a correct legacy login still succeeds.

### 2. Brute Force — No Login Rate Limiting (A07 Authentication Failures)
- **Report title:** Missing Rate Limiting on Authentication Endpoints — Severity: High
- **Secure fix:** Add per-account and per-IP throttling with exponential backoff, lockout and alerting; offer MFA for privileged roles.
- **Regression check:** Script 20 failed logins: attempts after the threshold are throttled/locked (429 or lockout message) while a legitimate user on another IP/account can still sign in after the window.

### 3. User Enumeration — Forgot-Password Oracle (A07 Authentication Failures)
- **Report title:** Account Enumeration via Password-Reset Responses — Severity: Medium
- **Secure fix:** Return one generic response for all reset requests regardless of whether the account exists.
- **Regression check:** Submit existing and non-existing emails to /forgot: responses (body, timing, status) are indistinguishable; a real user still receives a working reset link.

### 4. Password Reset — Predictable Token & Host-Header Poisoning (A07 Authentication Failures)
- **Report title:** Predictable Password-Reset Tokens / Host-Header Poisoning — Severity: Critical
- **Secure fix:** Generate reset tokens with a CSPRNG, store hashed, expire within an hour, single-use; build links from the configured base URL only.
- **Regression check:** Tokens are now long random values, single-use and expiring: a computed/guessed token is rejected, a used token cannot be replayed, and a Host-header-forged request cannot poison the emailed link.

### 5. Client-Trusted Session Cookie — Tenant Switch & Superadmin Flip (A01 Broken Access Control)
- **Report title:** Broken Session Management — Privileges Trusted from Client Cookie — Severity: Critical
- **Secure fix:** Use opaque server-side session IDs (or signed, server-verified tokens) and authorise from database state on every request.
- **Regression check:** Edit the cookie’s tenant/role/superadmin fields: the server ignores or rejects them (identity comes from server-side session state); /superadmin stays closed to non-admins.

## Registration & Invites

### 6. Mass Assignment — Registration & Workspace Settings (API3 Mass Assignment)
- **Report title:** Mass Assignment on Registration and Settings Endpoints — Severity: High
- **Secure fix:** Explicit per-endpoint field allowlists; server-side defaults for plan, seats and roles; reject unexpected privilege fields.
- **Regression check:** Replay register/settings posts with plan/seats/is_superadmin fields: the stored record keeps server-chosen values; normal registration and rename still work.

### 7. Weak Password Policy — 1-Character Passwords Accepted (A07 Authentication Failures)
- **Report title:** Missing Password Policy — Severity: Medium
- **Secure fix:** Enforce a minimum length (>=10) and block known-breached passwords at registration, invite acceptance and reset.
- **Regression check:** Try 1-character and common passwords at register/invite/reset: all rejected with a policy message; a compliant password is accepted.

### 8. Invite Links — Predictable Token, Any-Email Acceptance, Replay (A07 Authentication Failures)
- **Report title:** Weak Invite Token Design (Predictable, Unbound, Reusable) — Severity: High
- **Secure fix:** CSPRNG tokens (>=128-bit), stored hashed, bound to tenant + email, expiring and single-use; verify the acceptance email matches the invite.
- **Regression check:** Accept an invite with a different email, and replay a used link: both are refused; the invited email accepting once still works.

### 9. Cross-Tenant Invite Minting (A01 Broken Access Control)
- **Report title:** Cross-Tenant Invite Creation via Client-Supplied tenant_id — Severity: Critical
- **Secure fix:** Derive tenant scope from the session server-side; ignore or reject client-supplied tenant identifiers on writes.
- **Regression check:** Post /invites with a foreign tenant_id as a normal member: refused or ignored — the invite, if created, belongs to the caller’s own workspace only.

## Team & Roles

### 10. Privilege Escalation — Any Member Can Set Any Role (A01 Broken Access Control)
- **Report title:** Missing Authorisation on Role Management — Severity: Critical
- **Secure fix:** Require Owner/Admin role server-side for role changes; scope targets to the caller’s tenant; audit all role changes.
- **Regression check:** As a Viewer/Member, replay role-change posts for self and for a foreign-tenant user: both are refused (403); an Owner/Admin role change inside the tenant still works.

### 11. Cross-Site Request Forgery on State-Changing Forms (A01 Broken Access Control)
- **Report title:** Missing CSRF Protection on State-Changing Endpoints — Severity: High
- **Secure fix:** Per-session CSRF tokens on all state changes, SameSite=Lax/Strict session cookies, Origin/Referer verification as backup.
- **Regression check:** Replay a state-changing POST from a cross-site form (or without the app token): rejected; the same action from the app’s own form succeeds.

## Projects, Tasks & Files

### 12. Cross-Tenant IDOR — Projects, Tasks, Files & Invoices (A01 Broken Access Control)
- **Report title:** Insecure Direct Object References Across Tenants (Web) — Severity: Critical
- **Secure fix:** Scope all object queries by session tenant_id; return 404 on cross-tenant access; add tenant-isolation tests.
- **Regression check:** As Acme, request Globex project/task/file/invoice IDs: all return 404/403 with no data; own-tenant objects still open normally.

### 13. Stored XSS — Comments, Workspace Name & Chat (A03 Injection)
- **Report title:** Stored Cross-Site Scripting in Comments, Workspace Names and Chat — Severity: High
- **Secure fix:** Contextual output encoding on all user content at render; sanitise stored rich text; add a Content-Security-Policy.
- **Regression check:** Store the payload in a comment, workspace name and chat message: it renders as inert text everywhere, including the super-admin panel; plain comments still post.

## Search & Reports

### 14. SQL Injection — Project Search (A03 Injection)
- **Report title:** SQL Injection in Project Search — Severity: Critical
- **Secure fix:** Parameterised queries everywhere; generic error messages; least-privilege database access.
- **Regression check:** Replay the search injections: results contain only the caller’s tenant data (or a clean error with no SQL detail); normal search still finds own projects.

### 15. SQL Injection — Report Sort & Analytics Report Builder (A03 Injection)
- **Report title:** SQL Injection via Sort Parameters and Report Builder — Severity: High
- **Secure fix:** Allowlist sort columns and directions; parameterise search terms; suppress SQL errors to users.
- **Regression check:** Request reports with hostile sort values: rejected/falls back to a default ordering; the three legitimate sort options still work.

## Billing & Plans

### 16. Pro Features Gated Only in the UI (A01 Broken Access Control)
- **Report title:** Missing Server-Side Plan Entitlement Checks — Severity: High
- **Secure fix:** Enforce plan entitlements in server middleware on every gated route.
- **Regression check:** As a Free-plan user, open /reports, /integrations and /export directly: access is denied server-side; a Pro workspace keeps full access.

### 17. Billing Logic Abuse — Price Tampering, Trial & Seat Limits (A04 Insecure Design)
- **Report title:** Billing Logic Flaws (Client-Supplied Price, Unlimited Trial, Unenforced Seats) — Severity: High
- **Secure fix:** Recompute prices from the plan table server-side; enforce trial rules and seat limits in transactions at join/accept time.
- **Regression check:** Replay amount=1 plan changes, repeat trial extensions, and invite joins past the seat limit: price is server-computed, extension is capped, joins stop at the seat limit; a legitimate upgrade still works.

## API, Integrations & AI

### 18. API BOLA — Cross-Tenant API Access & User Dump (API1 BOLA / API3 Excessive Data)
- **Report title:** Broken Object-Level Authorisation in the REST API — Severity: Critical
- **Secure fix:** Derive tenant from the token server-side; ignore client tenant_id; enforce per-object ownership; minimise returned fields.
- **Regression check:** With an Acme token, request Globex data via ?tenant_id=, object IDs and /api/users: scoped to Acme or refused; own-tenant API reads/writes still work.

### 19. API Credential Attacks — Forged Tokens & Read-Key Writes (API2 Broken Authentication)
- **Report title:** Weak API Token Verification and Unenforced API-Key Scope — Severity: Critical
- **Secure fix:** Strong random secret from config (never exposed); pinned HS256 verification with expiry; enforce key scope per route.
- **Regression check:** Present an alg=none token and a token signed with a guessed secret: both rejected; a read-scope API key gets 403 on writes while reads succeed.

### 20. Server-Side Request Forgery — Webhooks, Import, AI & Scanner (A10 SSRF)
- **Report title:** Server-Side Request Forgery in URL-Fetching Features — Severity: High
- **Secure fix:** Allowlist permitted hosts and schemes; block loopback/private/link-local ranges post-resolution; disable or re-validate redirects.
- **Regression check:** Point webhook test / import / summarise / scanner at localhost and cloud-metadata addresses: blocked by the allowlist/egress rules; a public https URL still fetches.

### 21. AI Assistant — Prompt Injection & Cross-Tenant Knowledge Leak (LLM01 Prompt Injection)
- **Report title:** Prompt Injection Leading to Cross-Tenant Data Disclosure — Severity: High
- **Secure fix:** Per-tenant retrieval scoping; instruction/data separation; output filtering for secrets; never place other tenants’ data in context.
- **Regression check:** Repeat the injection phrases: the assistant refuses to reveal instructions and never returns another workspace’s snippet; normal knowledge questions for the caller’s workspace still answer.

## Apps Modules

### 22. Cross-Tenant Module Records — Read & Write IDOR (A01 Broken Access Control)
- **Report title:** Missing Tenant Authorisation Across App Modules — Severity: Critical
- **Secure fix:** Scope all module queries and actions by session tenant; 404 on cross-tenant IDs; isolation tests per module.
- **Regression check:** As Acme, open Globex module records and replay the bespoke cross-tenant actions (sign/download/cancel/edit): all refused; own records and actions unaffected.

### 23. Module Money Tampering — Wallet & Finance (A04 Insecure Design)
- **Report title:** Client-Controlled Money Amounts in Wallet and Finance Modules — Severity: High
- **Secure fix:** Validate amount > 0 and sufficient funds; read payable amounts from server records; atomic ledger updates.
- **Regression check:** Replay negative wallet transfers and under-priced finance payments: rejected (amount must be positive and equal to the server-side figure); a correct payment/transfer succeeds.

## Platform, Sharing & Exposure

### 24. Unauthenticated Exposure — /debug & /backup.sql (A05 Security Misconfiguration)
- **Report title:** Sensitive Data Exposure via Debug and Backup Endpoints — Severity: Critical
- **Secure fix:** Remove debug/backup endpoints from production builds; if retained, require admin auth + IP allowlist; generic error pages.
- **Regression check:** Request /debug and /backup.sql unauthenticated and as a normal user: gone or admin-only behind real auth; the app itself runs normally.

### 25. Guessable Public Tokens — Share, Tracking & Doc Links (A01 Broken Access Control)
- **Report title:** Predictable Public Link Tokens (Enumeration) — Severity: High
- **Secure fix:** Use >=128-bit random tokens for all public links, store hashed, support expiry and revocation; minimise data shown publicly.
- **Regression check:** Walk sequential public tokens: they no longer resolve (tokens are long and random); a genuine share/tracking link still opens for its holder.

### 26. CSV Export — Cross-Tenant Export & Formula Injection (A03 Injection)
- **Report title:** Cross-Tenant Data Export and CSV Formula Injection — Severity: High
- **Secure fix:** Scope exports to the session tenant; prefix/escape cells beginning with = + - @; audit export access.
- **Regression check:** Export with ?tenant_id= of another workspace, and export formula-leading titles: the export is scoped to the caller and cells are neutralised (leading =, +, -, @ escaped); a normal export still downloads.
