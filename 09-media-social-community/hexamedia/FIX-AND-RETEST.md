# HexaMedia — Fix & Retest Guide (LAB 83)

For every finding: the secure implementation and the regression test that proves the fix. After fixing, rerun the exploit — it must fail — and rerun the normal flow — it must still work.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- Severity: Critical
- Secure implementation: Use parameterised queries everywhere and never build SQL by string concatenation.
- Regression test: repeat the original exploit (POST /login) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

### Missing Brute-Force Protection on Login (No Rate Limiting or Lockout)
- Severity: High
- Secure implementation: Add per-account and per-IP rate limiting, progressive delays and lockout with alerting.
- Regression test: repeat the original exploit (POST /login) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

### User Enumeration Through Differential Authentication Responses
- Severity: Medium
- Secure implementation: Return one generic message for all login and reset outcomes regardless of account existence.
- Regression test: repeat the original exploit (POST /login and POST /forgot) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

### Working Demo Credentials Published on the Login Page
- Severity: Medium
- Secure implementation: Remove demo accounts and published credentials from production; rotate any shared passwords.
- Regression test: repeat the original exploit (Login page / POST /login) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

### Predictable Password Reset Token Enables Account Takeover
- Severity: High
- Secure implementation: Generate reset tokens with a CSPRNG (at least 128 bits), expire them quickly and make them single-use.
- Regression test: repeat the original exploit (POST /reset) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

### Authorisation Bypass via Client-Controlled Role Cookie
- Severity: Critical
- Secure implementation: Derive roles from the server-side session record only; ignore client-supplied role values.
- Regression test: repeat the original exploit (GET /editor and GET /admin) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

## Registration & Profile

### Weak Password Policy Allows Single-Character Passwords
- Severity: Medium
- Secure implementation: Enforce a minimum length of 12 characters and screen against breached-password lists.
- Regression test: repeat the original exploit (POST /register) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

### Mass Assignment in Registration Allows Privilege Escalation
- Severity: High
- Secure implementation: Whitelist the exact fields registration may set (email, password, name) and ignore everything else.
- Regression test: repeat the original exploit (POST /register) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

### Stored Cross-Site Scripting via Display Name
- Severity: High
- Secure implementation: Context-encode all user-supplied values on output and validate names against an allowlist of characters.
- Regression test: repeat the original exploit (POST /register or POST /profile (name field)) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

### Missing CSRF Protection on Profile Update
- Severity: Medium
- Secure implementation: Require and verify a per-session anti-CSRF token on every state-changing request.
- Regression test: repeat the original exploit (POST /profile) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

## Articles & Paywall

### Paywall Bypass via Client-Controlled Parameter
- Severity: High
- Secure implementation: Check the subscription status server-side from the account record before serving premium content.
- Regression test: repeat the original exploit (GET /article/<id>) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

### Insecure Direct Object Reference Exposes Draft and In-Review Articles
- Severity: High
- Secure implementation: Enforce status and ownership checks on article reads; return 404 for content the requester may not see.
- Regression test: repeat the original exploit (GET /article/<id>) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

### SQL Injection in Article Search Discloses Unpublished Content
- Severity: High
- Secure implementation: Use parameterised queries for search filters and restrict results to published content server-side.
- Regression test: repeat the original exploit (GET /search?q=) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

### Reflected Cross-Site Scripting in Search Results
- Severity: Medium
- Secure implementation: HTML-encode reflected input and deploy a Content-Security-Policy as defence in depth.
- Regression test: repeat the original exploit (GET /search?q=) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

## Editorial Workflow

### Broken Access Control Allows Unauthorised Article Publishing
- Severity: High
- Secure implementation: Require editor or admin role server-side for publish transitions and log all status changes.
- Regression test: repeat the original exploit (POST /article/<id>/status) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

### Missing Ownership Check Allows Editing Other Authors' Articles
- Severity: High
- Secure implementation: Verify article ownership (or editor/admin role) server-side on every edit.
- Regression test: repeat the original exploit (POST /article/<id>/edit) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

## Subscriptions & Payments

### Price Tampering in Subscription Checkout
- Severity: High
- Secure implementation: Determine the charge from the server-side plan catalogue and verify the paid amount before activating.
- Regression test: repeat the original exploit (POST /subscribe) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

### Single-Use Coupon Can Be Redeemed Repeatedly
- Severity: Medium
- Secure implementation: Persist coupon redemptions per account and reject repeats server-side.
- Regression test: repeat the original exploit (POST /subscribe) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

### Insecure Direct Object Reference in Subscription Cancellation
- Severity: Medium
- Secure implementation: Authorise subscription changes against the session user; ignore client-supplied user ids.
- Regression test: repeat the original exploit (POST /subscription/<userId>/cancel) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

## Comments

### Stored Cross-Site Scripting in Article Comments
- Severity: High
- Secure implementation: Encode comment output, sanitise any allowed markup and add a Content-Security-Policy.
- Regression test: repeat the original exploit (POST /article/<id>/comment) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

### Missing Authorisation on Comment Deletion (IDOR)
- Severity: Medium
- Secure implementation: Only the comment owner or a moderator may delete; verify server-side on each request.
- Regression test: repeat the original exploit (POST /comment/<id>/delete) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

## Newsletter & Audience

### Newsletter Subscriber List Exposed to Any Authenticated User
- Severity: High
- Secure implementation: Restrict audience data to admin role and audit access to personal data.
- Regression test: repeat the original exploit (GET /newsletter/subscribers) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

## Admin Panel

### Broken Access Control on Admin User Data Endpoint
- Severity: Critical
- Secure implementation: Enforce admin role on the endpoint and never return password material in API responses.
- Regression test: repeat the original exploit (GET /admin/users.json) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

### Missing CSRF Protection on Administrative Role Changes
- Severity: High
- Secure implementation: Verify anti-CSRF tokens on all admin actions and require re-authentication for role changes.
- Regression test: repeat the original exploit (POST /admin/user/<id>/role) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

## Platform & API

### Weak API Token Derivation Allows Premium Content Theft
- Severity: High
- Secure implementation: Issue random, revocable API tokens stored hashed server-side; never derive tokens from public data.
- Regression test: repeat the original exploit (GET /api/premium) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.

### Unauthenticated Debug Endpoint Exposes All User Accounts and Passwords
- Severity: Critical
- Secure implementation: Remove debug endpoints from production builds and scan deployments for leftover diagnostics.
- Regression test: repeat the original exploit (GET /api/debug) and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.
