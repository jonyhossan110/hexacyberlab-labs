# HexaVoice (LAB 37) — Fix & Retest

For every scored test: how to fix it properly, and the regression check that proves the fix. A fix passes retest when the original exploit now fails AND the legitimate workflow still works.

## Login & Authentication

### SQL Injection in legacy SSO login allows authentication bypass (Severity: Critical)
- **Fix:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

### No rate limiting or account lockout on login enables brute-force attacks (Severity: High)
- **Fix:** Add progressive delays/lockout after repeated failures, MFA, and breached-password screening.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

### Login and password-reset responses reveal whether an account exists (Severity: Medium)
- **Fix:** Return one generic message ("invalid credentials" / "if the account exists…") for every outcome.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

### Default demo account with a guessable password is active (Severity: High)
- **Fix:** Delete demo/default accounts before launch; force unique credentials for every seeded account.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

### Password-reset tokens are predictable (derived from the email address) (Severity: High)
- **Fix:** Generate reset tokens from a CSPRNG, store only a hash, expire them quickly and make them single-use.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

### Admin authorisation trusts a client-editable role cookie (Severity: Critical)
- **Fix:** Derive roles from the server-side session record only; ignore role claims in cookies or request data.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

## Registration & Profile

### Registration accepts single-character passwords (no password policy) (Severity: Medium)
- **Fix:** Enforce a minimum length (12+) and screen against known-breached passwords at registration and reset.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

### Registration allows mass assignment of role and plan fields (Severity: Critical)
- **Fix:** Whitelist the exact fields a request may set (name, email, password); assign role/plan server-side only.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

### Stored cross-site scripting via display name (Severity: High)
- **Fix:** Context-encode all user output; add a Content-Security-Policy as defence in depth.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

### Profile update lacks CSRF protection (Severity: Medium)
- **Fix:** Require a per-session anti-CSRF token on every state-changing request and verify Origin/Referer as a backstop.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

## Recordings & Transcripts

### Insecure direct object reference on recording pages exposes other users' recordings (Severity: High)
- **Fix:** Check ownership/sharing on every recording read; return 404 for objects the user may not see.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

### Unauthenticated predictable media URLs expose private recordings (Severity: Critical)
- **Fix:** Require authorisation on media delivery and use unguessable, signed URLs for private content.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

### Transcript update endpoint lacks ownership authorisation (Severity: High)
- **Fix:** Authorise the owner (or an explicit editor role) on every mutation endpoint, and log transcript changes.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

### Reflected cross-site scripting in recording search (Severity: Medium)
- **Fix:** Encode the query as text when reflecting it; deploy a restrictive Content-Security-Policy.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

## Sharing Links

### Share tokens are sequential and enumerable (Severity: High)
- **Fix:** Use cryptographically random, long tokens for share links; rate-limit token lookups.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

### Users can create public share links for recordings they do not own (Severity: Critical)
- **Fix:** Only the owner may share a recording; log share creation and let owners revoke links.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

## Speakers

### Speaker profiles (with private notes) accessible by any user (Severity: Medium)
- **Fix:** Scope speaker reads to the owning account; audit all secondary-object endpoints for ownership checks.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

### Speaker rename endpoint lacks ownership authorisation (Severity: Medium)
- **Fix:** Authorise ownership on speaker mutations; keep an audit trail of label changes.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

## Usage & Billing

### Transcription billing trusts client-supplied minute counts (Severity: High)
- **Fix:** Measure duration server-side from the actual media; ignore client-supplied usage figures.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

### Plan upgrade accepts client-supplied price (free enterprise upgrade) (Severity: High)
- **Fix:** Resolve prices from the server-side catalogue by plan id; reject client-supplied amounts.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

## API Access

### API keys are predictable (base64 of the account email) (Severity: Critical)
- **Fix:** Issue random, high-entropy API keys; store hashes; allow rotation and revocation.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

### Broken object-level authorisation in the recordings API (BOLA/IDOR) (Severity: High)
- **Fix:** Check object ownership for the API key's account on every API object read.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

## Webhooks & Integrations

### Webhook test fetch allows SSRF to internal addresses (Severity: High)
- **Fix:** Validate webhook URLs, block private/loopback ranges and metadata IPs, and resolve-then-pin DNS.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

## Admin Panel

### Admin user deletion is a tokenless GET request (CSRF) (Severity: High)
- **Fix:** Make destructive actions POST-only with anti-CSRF tokens and re-authentication for critical operations.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

## Platform & Data Exposure

### Public /debug endpoint exposes all user records including passwords (Severity: Critical)
- **Fix:** Remove debug endpoints from production builds; gate diagnostics behind admin auth and network restrictions.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.

### Missing HTTP security headers on all responses (Severity: Low)
- **Fix:** Set Content-Security-Policy, X-Frame-Options/frame-ancestors, X-Content-Type-Options and Referrer-Policy globally.
- **Retest:** Repeat the original exploit steps from PRACTICE-GUIDE.md exactly. Expected after the fix: the exploit is blocked (403/401/generic error or the tampered value is ignored) and this test can no longer be completed; then repeat the normal user workflow to confirm nothing legitimate broke. Record both results.
