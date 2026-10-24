# HexaInvest — Fix & Retest (LAB 45)

For every scored test: the secure implementation, the remediation, and the regression check to retest after fixing.

## Login & Authentication

### SQL Injection in Login (Authentication Bypass) (Critical)
- **Fix:** Use parameterised queries / prepared statements for all database access; never concatenate user input into SQL.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

### Missing Brute-Force Protection on Login (High)
- **Fix:** Add per-account and per-IP rate limiting, exponential backoff and lockout/alerting after repeated failures.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

### Account Enumeration via Distinct Login Errors (Medium)
- **Fix:** Return one generic error ("Invalid email or password") for every failed login, with identical timing.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

### Default Credentials on Administrator Account (Critical)
- **Fix:** Force a unique strong password at first login; disable or rename seeded accounts in production.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

### Predictable Password Reset Token (High)
- **Fix:** Generate reset tokens with a CSPRNG (>=128 bits), store only a hash, expire them quickly and bind them to a single use.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

### Client-Side Role Cookie Trusted for Authorization (High)
- **Fix:** Keep roles in the server-side session record only; never authorize from client-supplied values.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

## Registration & Profile

### No Minimum Password Strength on Registration (Medium)
- **Fix:** Enforce a minimum length (>=10) and screen new passwords against known-breached lists.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

### Mass Assignment in Registration (Role/Balance) (Critical)
- **Fix:** Allow-list bindable fields per endpoint; set role and balance server-side only.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

### Stored Cross-Site Scripting in Display Name (High)
- **Fix:** Context-encode all user data on output and validate input; add a Content-Security-Policy as defence in depth.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

### Cross-Site Request Forgery on Profile Update (Medium)
- **Fix:** Require a per-session CSRF token on all state-changing requests and verify Origin/Referer as a secondary check.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

## Portfolio

### Insecure Direct Object Reference on Portfolio (High)
- **Fix:** Authorize every object access against the session user on the server; return 404/403 for other users’ objects.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

### Insecure Direct Object Reference on Trade History (High)
- **Fix:** Apply the same server-side ownership check to every sub-resource route (transactions, exports, attachments).
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

## Trading & Orders

### Client-Supplied Price Trusted in Order Execution (Critical)
- **Fix:** Ignore client-sent prices; execute all orders against the server-side market price at fill time.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

### Negative Quantity Accepted in Trade Execution (High)
- **Fix:** Validate quantity as a positive integer within defined bounds before any balance or holdings math.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

### Missing Funds Validation Allows Negative Balances (High)
- **Fix:** Verify sufficient funds inside the same transaction that fills the order; reject with a clear error otherwise.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

### Missing Ownership Check on Order Cancellation (High)
- **Fix:** Bind every order mutation to the owning account server-side; log and alert on cross-account attempts.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

### Unauthenticated Price-Feed Update Parameter (Critical)
- **Fix:** Remove client-writable feed parameters; accept price updates only from an authenticated, signed feed service.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

## Watchlist

### Stored Cross-Site Scripting in Watchlist Note (Medium)
- **Fix:** Output-encode note text everywhere it renders and strip or sanitise HTML on input.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

### Insecure Direct Object Reference on Watchlist (Medium)
- **Fix:** Scope watchlist queries to the session user; never honour a client-supplied owner id.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

## Reports & Exports

### Missing Authorization on Report CSV Export (High)
- **Fix:** Authorize exports against the session user and audit-log every export download.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

### Unauthenticated Bulk Report Export (All Investors) (Critical)
- **Fix:** Restrict bulk exports to verified admin sessions and rate-limit + alert on their use.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

## Admin Panel

### Broken Access Control on Admin Users API (Credential Exposure) (Critical)
- **Fix:** Enforce admin role on the endpoint server-side and never serialize password fields in API responses.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

### Cross-Site Request Forgery on Admin Credit Action (High)
- **Fix:** Add per-session CSRF tokens to all admin forms, verify Origin, and set session cookies SameSite=Lax or Strict.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

## Platform & API

### Predictable API Token (Base64 of Email) (High)
- **Fix:** Issue random per-user API keys, store hashes, support revocation, and send keys in headers over TLS only.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.

### Unauthenticated Debug Endpoint Exposing Full State (Critical)
- **Fix:** Remove debug endpoints from production builds; gate any diagnostics behind admin auth and IP allow-lists.
- **Retest:** repeat the original exploit from the Practice Guide — it must now fail (no test progress in a fresh instance, no effect on balances, holdings, sessions or other accounts), while the legitimate workflow keeps working.
