# HexaPackage — Fix & Retest

For every scored test: the secure implementation pattern and a regression check proving
the exploit no longer works.

## SQL injection login bypass — Critical
- **Finding (report title):** SQL Injection in Login Allows Authentication Bypass
- **Secure implementation:** Use parameterised queries everywhere and never build SQL by concatenating request input.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Brute force — no rate limit or lockout — High
- **Finding (report title):** Missing Rate Limiting on Login Enables Brute Force
- **Secure implementation:** Add progressive delays, per-account and per-IP throttling, lockout and alerting on repeated failures.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## User enumeration via login responses — Medium
- **Finding (report title):** Account Enumeration via Distinct Login Error Messages
- **Secure implementation:** Return one generic "invalid email or password" message and identical behaviour for unknown accounts.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Default demo credentials still active — High
- **Finding (report title):** Default Demo Credentials Enabled in Production
- **Secure implementation:** Remove or force-reset all default accounts before deployment and audit for vendor defaults regularly.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Predictable password-reset token — Critical
- **Finding (report title):** Password Reset Token Is Predictable (Derived from Email)
- **Secure implementation:** Generate reset tokens from a CSPRNG, store only a hash, expire them quickly and make them single-use.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Session role trusted from a client cookie — Critical
- **Finding (report title):** Privilege Escalation via Client-Controlled Role Cookie
- **Secure implementation:** Keep roles in the server-side session record only; never derive authorisation from client-supplied cookies.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Weak password policy at registration — Medium
- **Finding (report title):** Registration Accepts Trivially Weak Passwords
- **Secure implementation:** Enforce a minimum length (12+) and screen new passwords against known-breached lists.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Mass assignment — role set from request body — High
- **Finding (report title):** Mass Assignment Allows Role Escalation via Profile Update
- **Secure implementation:** Whitelist bindable fields per endpoint; never accept role/privilege fields from client input.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Stored XSS in publisher display name — High
- **Finding (report title):** Stored Cross-Site Scripting in Display Name
- **Secure implementation:** Contextually encode all user-supplied output and add a Content-Security-Policy as defence in depth.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## CSRF on profile update — Medium
- **Finding (report title):** Missing CSRF Protection on Profile Update
- **Secure implementation:** Require per-session anti-CSRF tokens on all state-changing requests and verify Origin/Referer.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Package takeover via maintainer manipulation — Critical
- **Finding (report title):** Broken Access Control Allows Adding Maintainers to Any Package
- **Secure implementation:** Verify package ownership/maintainer status server-side before any maintainer change, and notify owners of changes.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Version overwrite — republish replaces a released version — Critical
- **Finding (report title):** Published Versions Can Be Overwritten (No Immutability)
- **Secure implementation:** Reject publishing an existing version number; treat releases as immutable and require a new version for any change.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Unpublish/delete versions of other publishers' packages — High
- **Finding (report title):** Missing Authorisation on Unpublish Allows Deleting Others' Releases
- **Secure implementation:** Restrict unpublish/delete to package owners (and admins), with confirmation and audit logging.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Ownership claim of an active package (name-squat transfer) — Critical
- **Finding (report title):** Package Ownership Claim Works on Active Packages (No Abandonment Check)
- **Secure implementation:** Verify inactivity server-side, require owner notification and a waiting period before any ownership transfer.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Stored XSS in package README / description — High
- **Finding (report title):** Stored Cross-Site Scripting via Package README/Description
- **Secure implementation:** Render README through a sanitising Markdown pipeline and encode descriptions; never inject raw user HTML.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## SQL injection in package search exposes unlisted packages — High
- **Finding (report title):** SQL Injection in Search Leaks Unlisted Packages
- **Secure implementation:** Parameterise search queries and enforce visibility filters in the data layer, not the presentation layer.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Reflected XSS in search results — Medium
- **Finding (report title):** Reflected Cross-Site Scripting in Search
- **Secure implementation:** Encode all reflected values on output and validate input types at the boundary.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Read-only token can publish (scope never checked) — High
- **Finding (report title):** API Publish Endpoint Ignores Token Scope
- **Secure implementation:** Enforce scope checks on every API operation (publish requires the publish scope) and test them per endpoint.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Token IDOR — view other publishers' token values — Critical
- **Finding (report title):** Insecure Direct Object Reference Exposes All Publish Tokens
- **Secure implementation:** Scope every token query to the authenticated owner and show token values only once, at creation.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Legacy API key derived from the account email — High
- **Finding (report title):** API Key Predictably Derived from Email Address
- **Secure implementation:** Issue random, high-entropy API keys, store hashes, and retire derivation-based legacy schemes.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## API returns unlisted package data to any token — High
- **Finding (report title):** API Exposes Unlisted Packages Without Authorisation
- **Secure implementation:** Apply the same ownership/visibility authorisation in the API as in the web UI, with tests for both.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Download-count inflation (no rate limit / dedup) — Medium
- **Finding (report title):** Download Statistics Can Be Inflated Without Limit
- **Secure implementation:** Deduplicate downloads per user/IP over a window and rate-limit the download endpoint.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Detailed download stats of others' packages are public — Medium
- **Finding (report title):** Broken Access Control on Package Download Statistics
- **Secure implementation:** Restrict stats pages to the package owner/maintainers and aggregate away downloader identities.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Admin user deactivation via simple GET (CSRF) — High
- **Finding (report title):** State-Changing Admin Action Performed via GET (CSRF)
- **Secure implementation:** Make all state changes POST-only with anti-CSRF tokens and re-authentication for destructive admin actions.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.

## Debug endpoint dumps users, passwords and tokens — Critical
- **Finding (report title):** Exposed Debug Endpoint Discloses Credentials and Tokens
- **Secure implementation:** Remove debug endpoints from production builds and gate diagnostics behind admin auth on a separate interface.
- **Regression test:** re-run the original exploit steps from PRACTICE-GUIDE.md and confirm the attack is rejected (4xx / generic error) and the test no longer triggers on the fixed build.
