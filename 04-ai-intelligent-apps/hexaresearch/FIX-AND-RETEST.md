# HexaResearch — Fix & Retest Guide (LAB 34)

For every scored test: the secure implementation and the regression check that proves the fix.

## SQL Injection in Login Form (Critical)
- Test: SQL Injection Login Bypass — A03:2021 Injection
- Fix: Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Missing Rate Limiting on Login (High)
- Test: Brute Force — No Rate Limiting — A07:2021 Auth Failures
- Fix: Add progressive delays, lockout and alerting on repeated failed logins per account and per IP.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## User Enumeration via Password Reset Responses (Medium)
- Test: User Enumeration via Forgot Password — A07:2021 Auth Failures
- Fix: Return one identical response whether or not the account exists.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Default Administrator Credentials in Use (Critical)
- Test: Weak Default Admin Credentials — A07:2021 Auth Failures
- Fix: Force a unique strong admin password at first setup and disable shipped defaults.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Predictable Password Reset Tokens (High)
- Test: Predictable Password Reset Token — A07:2021 Auth Failures
- Fix: Generate reset tokens from a CSPRNG, store hashed, expire within minutes, single use.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Client-Side Role Cookie Trusted for Authorization (Critical)
- Test: Role Cookie Tampering — A01:2021 Broken Access Control
- Fix: Derive roles from the server-side session record only; ignore client-supplied role claims.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## No Minimum Password Strength Policy (Medium)
- Test: Weak Password Policy — A07:2021 Auth Failures
- Fix: Enforce a minimum length and block common passwords at registration and password change.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Mass Assignment Allows Role Escalation at Registration (Critical)
- Test: Mass Assignment — Role at Registration — A01:2021 Broken Access Control
- Fix: Whitelist bindable fields on registration; set role server-side to the least-privilege default.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Stored Cross-Site Scripting via Display Name (High)
- Test: Stored XSS in Display Name — A03:2021 Injection
- Fix: Context-encode all user-supplied values on output; validate input on entry.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Missing CSRF Protection on Profile Update (Medium)
- Test: CSRF on Profile Update — A01:2021 Broken Access Control
- Fix: Require a per-session anti-CSRF token on all state-changing requests and verify Origin/Referer.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Insecure Direct Object Reference on Research Projects (High)
- Test: Private Project IDOR — Read — A01:2021 Broken Access Control
- Fix: Verify ownership or team membership on every project read; return 404 for non-owned private objects.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Missing Authorization on Project Deletion (High)
- Test: Private Project IDOR — Delete — A01:2021 Broken Access Control
- Fix: Enforce owner-only deletion server-side and log destructive actions.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Insecure Direct Object Reference on Sources (High)
- Test: Private Source IDOR — A01:2021 Broken Access Control
- Fix: Authorize source reads through the parent project's ownership/team rules.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Server-Side Request Forgery in Source Import (High)
- Test: SSRF via Add-Source-by-URL — A10:2021 SSRF
- Fix: Allowlist fetch hosts, block private/loopback ranges, and disable redirects to internal addresses.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Stored XSS via Source Title in Generated Reports (High)
- Test: Citation Poisoning — Stored XSS in Reports — A03:2021 Injection
- Fix: Encode source titles and all citation fields when rendering reports; sanitize stored content.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Indirect Prompt Injection Causing Private Data Disclosure (High)
- Test: Prompt Injection Leaks Private Notes — LLM01 Prompt Injection
- Fix: Treat retrieved content as data only, strip instruction-like markers, and never let the model access data the requester cannot see.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Insecure Direct Object Reference on Generated Reports (High)
- Test: Generated Report IDOR — A01:2021 Broken Access Control
- Fix: Check report ownership/team access on every read.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Private Notes Exposed Through Global Search (High)
- Test: Search Leaks Private Notes — A01:2021 Broken Access Control
- Fix: Filter search results by the requester's access rights, and never index private notes globally.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Reflected Cross-Site Scripting in Search (Medium)
- Test: Reflected XSS in Search — A03:2021 Injection
- Fix: HTML-encode the reflected query and all user input on output.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## SQL Injection in Global Search (Critical)
- Test: SQL Injection in Search — A03:2021 Injection
- Fix: Parameterise search queries and enforce access filters in the query itself.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Predictable Share Tokens for Reports (High)
- Test: Guessable Share Link — A01:2021 Broken Access Control
- Fix: Use long random unguessable tokens for share links and allow revocation.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## No Rate Limiting on Share Link Endpoint (Medium)
- Test: Share Link Enumeration — A01:2021 Broken Access Control
- Fix: Rate-limit and log share-link lookups; alert on enumeration patterns.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Broken Access Control on Team Join (High)
- Test: Join Any Team Without an Invite — A01:2021 Broken Access Control
- Fix: Require a valid invite or owner approval for team membership changes.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## State-Changing GET Request Deletes Users (CSRF) (High)
- Test: Admin Action via GET — User Deletion CSRF — A01:2021 Broken Access Control
- Fix: Make admin actions POST-only with anti-CSRF tokens and confirmation.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.

## Unauthenticated Sensitive Data Exposure at /api/users (Critical)
- Test: Unauthenticated User Dump at /api/users — A01:2021 Broken Access Control
- Fix: Require authentication and authorization on all API endpoints; never return password material.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (blocked, rejected or neutralised), while the legitimate workflow still succeeds.
