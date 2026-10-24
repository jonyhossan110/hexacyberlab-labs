# HexaWebhook — Fix & Retest

For every finding: the secure implementation, and the regression test that proves the fix. Retest method: re-run the original exploit after the fix — it must fail — then re-run the legitimate flow — it must still work.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- Fix: Use parameterised queries / prepared statements everywhere and never concatenate user input into SQL.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### No Rate Limiting or Account Lockout on Login (High)
- Fix: Add progressive delays, per-account and per-IP rate limits, lockout/backoff and breached-password checks.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### User Enumeration via Authentication Error Messages (Medium)
- Fix: Return one generic message ("invalid credentials") for every failed login and reset request.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### Default/Seeded Credentials Active in Production (High)
- Fix: Remove seeded accounts before launch and force unique credentials during installation.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### Predictable Password Reset Token Allows Account Takeover (Critical)
- Fix: Generate reset tokens with a CSPRNG (≥128 bit), store only a hash, expire them quickly and make them single-use.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### Authorization Based on Client-Supplied Role Cookie (Critical)
- Fix: Derive roles only from the server-side session record; never trust role claims sent by the browser.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

## Registration & Profile

### Mass Assignment in Registration Allows Admin Self-Creation (Critical)
- Fix: Whitelist assignable fields on registration and set role/tier server-side only.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### Missing Password Complexity Policy (Medium)
- Fix: Enforce a minimum length (≥10) and check new passwords against known-breached lists.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### Stored Cross-Site Scripting via Display Name (High)
- Fix: Context-encode all user data on output and add a strict Content-Security-Policy.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### Cross-Site Request Forgery on Profile Update (Medium)
- Fix: Require per-session CSRF tokens on every state-changing form and verify Origin/Referer as defence in depth.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

## Projects

### Insecure Direct Object Reference on Project Pages (High)
- Fix: Check ownership (or team membership) on every object read and write, server-side.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### Missing Authorization on Project Update (Write IDOR) (High)
- Fix: Enforce ownership checks on update/delete handlers exactly as on reads.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

## Endpoints & SSRF

### Server-Side Request Forgery via Endpoint URL (Critical)
- Fix: Allowlist destination hosts, block private/reserved IP ranges, resolve DNS before connecting and re-check redirects.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### SSRF to Cloud Metadata Service Exposes Credentials (Critical)
- Fix: Block 169.254.169.254 and all link-local ranges at the fetcher, and require IMDSv2-style protections in deployment.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### Endpoint Details (incl. Signing Secret) Exposed via IDOR (High)
- Fix: Check project ownership before rendering endpoint details and mask secrets by default.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### Unauthenticated API Returns Endpoint Signing Secrets (Critical)
- Fix: Require authentication on every API route and exclude secret fields from API responses.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

## Subscriptions

### Missing Authorization on Subscription Update (High)
- Fix: Verify endpoint ownership in the subscription handler before applying changes.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### No Allowlist on Subscribable Event Types (Medium)
- Fix: Validate subscriptions against a per-plan allowlist and reject wildcards for non-admin accounts.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

## Deliveries & Logs

### Insecure Direct Object Reference on Delivery Logs (High)
- Fix: Scope every delivery read to projects the caller owns.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### Missing Authorization on Delivery Replay (High)
- Fix: Check delivery ownership in the replay handler and log replays as auditable events.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### Delivery Log Export Not Scoped to Caller (High)
- Fix: Scope exports to the caller’s projects and restrict bulk export to admins.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

## Admin Panel

### Admin API Missing Authorization (Full User Dump) (Critical)
- Fix: Enforce admin role checks on admin API routes and never return password fields.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### Cross-Site Request Forgery on Admin User Management (High)
- Fix: Add CSRF tokens to all admin actions and set SameSite=Lax or Strict on session cookies.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

## Platform & API

### API Accepts Predictable Token Derived from Email (Critical)
- Fix: Retire the legacy token format; issue only high-entropy tokens and store them hashed.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### Exposed Debug Endpoint Leaks Credentials and Secrets (Critical)
- Fix: Remove debug endpoints from production builds and gate diagnostics behind admin auth + IP allowlists.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.

### Missing HTTP Security Headers (Low)
- Fix: Set X-Frame-Options/frame-ancestors, X-Content-Type-Options: nosniff and a Content-Security-Policy on all responses.
- Retest: repeat the exploit from the Practice Guide; expect it to be blocked AND the normal user flow to keep working.
