# HexaWorkflow (LAB 109) — Fix & Retest

For every scored test: the secure implementation and the regression check.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- Severity: Critical
- Secure implementation: Use parameterised queries/prepared statements for all database access and reject unexpected input.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

### Missing Rate Limiting on Login Allows Brute Force Attacks
- Severity: High
- Secure implementation: Add per-account and per-IP rate limiting, progressive delays and lockout/alerting after repeated failures.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

### User Enumeration via Authentication Error Messages
- Severity: Medium
- Secure implementation: Return one generic error ("invalid email or password") for every failed login and reset request.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

### Publicly Documented Demo Account Credentials
- Severity: High
- Secure implementation: Remove demo/sample accounts and credentials from production, or disable them and rotate their passwords.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

### Predictable Password Reset Tokens Allow Account Takeover
- Severity: Critical
- Secure implementation: Generate reset tokens with a CSPRNG (at least 128 bits), store them hashed, and expire them quickly.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

### Authorization Role Trusted from Client-Side Cookie
- Severity: Critical
- Secure implementation: Derive roles only from the server-side session record; never trust role claims stored in cookies.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

## Registration & Profile

### Weak Password Policy Allows Single-Character Passwords
- Severity: Medium
- Secure implementation: Enforce a minimum length of 10+ characters and screen new passwords against known-breached lists.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

### Mass Assignment in Registration Allows Privilege Escalation
- Severity: High
- Secure implementation: Whitelist the exact fields a request may set; never bind role, plan or balance fields from user input.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

### Stored Cross-Site Scripting via Display Name
- Severity: High
- Secure implementation: Contextually output-encode all user-supplied data and add a Content-Security-Policy header.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

### Missing CSRF Protection on Profile Update
- Severity: Medium
- Secure implementation: Require a per-session anti-CSRF token on every state-changing request and verify Origin/Referer.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

## Workflows

### Insecure Direct Object Reference on Workflow Detail (Cross-Tenant)
- Severity: High
- Secure implementation: Enforce workspace/ownership checks on every object lookup, server-side.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

### Private Workflow Accessible by Direct URL
- Severity: High
- Secure implementation: Check the private flag and ownership on the server before serving any workflow content.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

### Missing Authorization on Workflow Execute/Toggle Endpoints
- Severity: High
- Secure implementation: Verify the caller's workspace and role before executing or modifying any workflow.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

### Cross-Tenant Workflow Export Without Authorization
- Severity: High
- Secure implementation: Apply the same tenancy checks to export endpoints as to the UI, and audit export access.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

### SQL Injection in Workflow Search
- Severity: High
- Secure implementation: Parameterise the search query and scope results to the caller's workspace.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

### Reflected Cross-Site Scripting in Search
- Severity: Medium
- Secure implementation: HTML-encode reflected values and validate search input.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

## Runs & History

### Insecure Direct Object Reference on Run History
- Severity: Medium
- Secure implementation: Scope run-log queries to workflows the caller is authorized to see.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

## Templates

### Private Template Reuse Without Ownership Check
- Severity: Medium
- Secure implementation: Only serve platform templates and the caller's own templates; verify ownership on use.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

## Integrations & API Keys

### Exposure of Other Users' API Keys on Integrations Page
- Severity: High
- Secure implementation: Show each user only their own key, masked after creation, with per-key audit logs.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

### Missing Authorization on API Key Rotation
- Severity: High
- Secure implementation: Ignore client-supplied user ids; always operate on the authenticated user's own keys.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

### Server-Side Request Forgery in Webhook Test Feature
- Severity: Critical
- Secure implementation: Allowlist webhook destinations, block private/link-local IP ranges, and disable redirects to internal targets.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

### Weak API Authentication Accepts Base64-Encoded Email
- Severity: Critical
- Secure implementation: Accept only the issued high-entropy API keys, compared in constant time, and remove legacy fallbacks.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

## Workspaces & Members

### Privilege Escalation via Workspace Role Endpoint
- Severity: High
- Secure implementation: Restrict role changes to workspace owners and verify the actor's role server-side.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

## Admin Panel

### Broken Access Control on Admin Panel
- Severity: Critical
- Secure implementation: Enforce admin authorization middleware on all /admin routes using the server-side session role.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

### Missing CSRF Protection on Administrative Actions
- Severity: High
- Secure implementation: Add per-session CSRF tokens to all admin forms and verify them server-side.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.

## Platform & API

### Unauthenticated Debug Endpoint Exposes Full Database Dump
- Severity: Critical
- Secure implementation: Remove debug endpoints from production builds; gate any diagnostics behind admin auth and IP allowlists.
- Regression test: repeat the original exploit after the fix; it must fail and the test must no longer flip on a fresh lab.
