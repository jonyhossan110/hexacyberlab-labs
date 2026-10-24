# HexaStream (LAB 84) — Fix & Retest

For every scored test: the report entry, the secure implementation, and the regression test that proves the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- Severity: Critical
- Secure implementation: Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.
- Regression test: repeat the original exploit (POST /login) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

### Missing Brute-Force Protection on Authentication Endpoint
- Severity: High
- Secure implementation: Add progressive rate limiting, temporary lockout and alerting on repeated failed logins per account and per IP.
- Regression test: repeat the original exploit (POST /login) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

### User Enumeration Through Differential Authentication Responses
- Severity: Medium
- Secure implementation: Return one generic message ("If the account exists, we sent a link") for every authentication and reset outcome.
- Regression test: repeat the original exploit (POST /login · POST /forgot) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

### Valid Demo Credentials Published on the Login Page
- Severity: Medium
- Secure implementation: Remove demo credentials from production pages and disable default/demo accounts outside isolated demo environments.
- Regression test: repeat the original exploit (GET /login · POST /login) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

### Password-Reset Tokens Are Predictable From the User ID
- Severity: High
- Secure implementation: Generate reset tokens with a CSPRNG (at least 128 bits), store them hashed, expire them quickly and make them single-use.
- Regression test: repeat the original exploit (POST /reset) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

### Authorization Role Taken From a Client-Controlled Cookie
- Severity: High
- Secure implementation: Store the role only in the server-side session record and re-check it on every privileged request.
- Regression test: repeat the original exploit (GET /creator) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

## Registration & Profile

### No Minimum Password Strength Enforced at Registration
- Severity: Medium
- Secure implementation: Enforce a minimum length (12+ recommended) and screen new passwords against known-breached password lists.
- Regression test: repeat the original exploit (POST /register) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

### Mass Assignment Allows Privilege and Tier Escalation at Registration
- Severity: High
- Secure implementation: Whitelist the exact fields registration may set (name, email, password) and assign role/tier only in server-side code.
- Regression test: repeat the original exploit (POST /register) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

### Stored Cross-Site Scripting via Display Name
- Severity: High
- Secure implementation: Context-encode all user-supplied output and validate names against an allowlist of characters.
- Regression test: repeat the original exploit (POST /register · POST /profile → video pages) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

### Missing CSRF Protection on Profile Update
- Severity: Medium
- Secure implementation: Require a per-session anti-CSRF token on every state-changing request and verify Origin/Referer as defence in depth.
- Regression test: repeat the original exploit (POST /profile) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

## Search & Library

### SQL Injection in Search Exposes Unlisted Content
- Severity: High
- Secure implementation: Parameterise search queries and enforce listing/visibility filters in the query itself, not just in the UI.
- Regression test: repeat the original exploit (GET /search?q=) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

### Reflected Cross-Site Scripting in Search
- Severity: Medium
- Secure implementation: HTML-encode all reflected input and deploy a restrictive Content-Security-Policy.
- Regression test: repeat the original exploit (GET /search?q=) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

## Playback & Tokens

### Premium Entitlement Checked Against a Client-Supplied Parameter
- Severity: Critical
- Secure implementation: Derive entitlements exclusively from the authenticated account record on the server for every playback request.
- Regression test: repeat the original exploit (GET /watch/:id?tier=) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

### Playback Tokens Are Unsigned and Forgeable
- Severity: High
- Secure implementation: Sign playback tokens (HMAC) with a server secret, bind them to user, video and a short expiry.
- Regression test: repeat the original exploit (GET /stream/:id?token=) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

### Unlisted Content Accessible by Direct Object Reference
- Severity: Medium
- Secure implementation: Enforce listing/visibility checks on the object endpoint and use unguessable IDs for unlisted content.
- Regression test: repeat the original exploit (GET /video/:id) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

## Watchlists & History

### Insecure Direct Object Reference in Watchlist View
- Severity: Medium
- Secure implementation: Ignore client-supplied user identifiers; serve only the authenticated user's own watchlist.
- Regression test: repeat the original exploit (GET /watchlist?user=) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

### Insecure Direct Object Reference in Watch History
- Severity: Medium
- Secure implementation: Scope all history queries to the authenticated user on the server side.
- Regression test: repeat the original exploit (GET /history?user=) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

### State-Changing IDOR in Watchlist Removal
- Severity: Medium
- Secure implementation: Derive the list owner from the session and verify ownership before any mutation.
- Regression test: repeat the original exploit (POST /watchlist/remove) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

## Membership & Payments

### Client-Supplied Price Trusted in Membership Upgrade
- Severity: High
- Secure implementation: Recompute the charge server-side from the plan catalogue and verify the payment amount before granting the tier.
- Regression test: repeat the original exploit (POST /membership/upgrade) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

### Single-Use Coupon Redemption Not Enforced
- Severity: Medium
- Secure implementation: Record redemptions in a transaction and reject any code already redeemed by the account.
- Regression test: repeat the original exploit (POST /membership/upgrade) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

## Comments

### Stored Cross-Site Scripting in Video Comments
- Severity: High
- Secure implementation: Encode comment text on render and sanitise with a proven library; add a Content-Security-Policy.
- Regression test: repeat the original exploit (POST /comment → GET /video/:id) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

### Missing Ownership Check on Comment Deletion
- Severity: Medium
- Secure implementation: Verify the comment belongs to the session user (or a moderator) before deleting.
- Regression test: repeat the original exploit (POST /comment/delete) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

## Creator Studio

### Unrestricted File Upload of HTML/SVG Served From the Application Domain
- Severity: High
- Secure implementation: Allowlist media types, verify file signatures, rename uploads, and serve them from a separate cookieless domain with safe Content-Type.
- Regression test: repeat the original exploit (POST /creator/upload → GET /files/:name) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

### Missing Ownership Check on Video Metadata Editing
- Severity: Medium
- Secure implementation: Verify video.ownerId equals the session user (or admin) before applying metadata changes.
- Regression test: repeat the original exploit (POST /creator/edit) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

## Admin & Platform

### Broken Access Control on Admin Console
- Severity: Critical
- Secure implementation: Enforce an admin role check on the server for every admin route and never render credential material.
- Regression test: repeat the original exploit (GET /admin) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.

### Unauthenticated Debug Endpoint Exposes User Credentials
- Severity: Critical
- Secure implementation: Remove debug endpoints from production builds and require admin authentication plus IP allowlisting for diagnostics.
- Regression test: repeat the original exploit (GET /api/debug) after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.
