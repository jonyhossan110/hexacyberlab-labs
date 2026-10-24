# HexaForum — Fix & Retest Guide (LAB 82)

For every test: the report entry, the secure implementation, and the regression retest.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- Severity: Critical
- Secure implementation: Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### Missing Brute-Force Protection on Login (No Rate Limiting or Lockout)
- Severity: High
- Secure implementation: Rate-limit login attempts per account and IP, add progressive delays / lockout and offer MFA.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### User Enumeration Through Differential Authentication Responses
- Severity: Medium
- Secure implementation: Return one generic message ("Invalid email or password") for every failed login and reset request.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### Demo Moderator Account with Publicly Published Credentials
- Severity: High
- Secure implementation: Remove demo/default accounts from production, or force a unique strong password and disable them after onboarding.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### Predictable Password Reset Token Allows Account Takeover
- Severity: High
- Secure implementation: Generate reset tokens from a CSPRNG (at least 128 bits), expire them quickly and invalidate after use.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### Client-Side Role Cookie Trusted for Authorization (Privilege Escalation)
- Severity: High
- Secure implementation: Store roles server-side in the session record; never trust client-supplied role claims.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

## Registration & Profile

### No Minimum Password Strength Enforced at Registration
- Severity: Medium
- Secure implementation: Enforce a minimum length (12+ recommended) and block known-breached passwords.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### Mass Assignment in Registration Allows Privilege and Reputation Forgery
- Severity: High
- Secure implementation: Whitelist the exact fields a request may set (email, name, password) and assign role/reputation server-side.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### Stored Cross-Site Scripting via Display Name
- Severity: High
- Secure implementation: Contextually encode all user output and add a Content-Security-Policy as defence in depth.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### Missing CSRF Protection on Profile Update
- Severity: Medium
- Secure implementation: Require a per-session CSRF token on every state-changing form and verify Origin/Referer.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

## Boards & Threads

### Broken Access Control on Private Board (Staff Lounge)
- Severity: High
- Secure implementation: Enforce role checks on the server for every board, thread and post read.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### Hidden Threads Accessible via Direct URL (Insecure Direct Object Reference)
- Severity: Medium
- Secure implementation: Check the hidden/moderation state and the requester's role on every thread read.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### Insecure Direct Object Reference Allows Editing Other Users' Posts
- Severity: High
- Secure implementation: Verify ownership (or a moderation role) on the server before applying any edit.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### Stored Cross-Site Scripting in Forum Posts
- Severity: High
- Secure implementation: Encode post bodies on output (or sanitise with a strict allowlist) and deploy a Content-Security-Policy.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

## Search

### SQL Injection in Search Exposes Private and Hidden Threads
- Severity: High
- Secure implementation: Parameterise the search query and apply board-visibility filters in the data layer, not the presentation layer.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### Reflected Cross-Site Scripting via Search Query
- Severity: Medium
- Secure implementation: HTML-encode all reflected values and validate search input.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

## Reputation & Voting

### Missing Server-Side Check Allows Self-Voting
- Severity: Low
- Secure implementation: Reject votes where voter == author on the server.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### Client-Supplied Vote Value Trusted (Reputation Tampering)
- Severity: Medium
- Secure implementation: Fix vote weight server-side (±1) and ignore any client-sent amount.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### Missing One-Vote-Per-User Enforcement Allows Vote Stuffing
- Severity: Medium
- Secure implementation: Store votes uniquely per (user, post) and reject duplicates.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

## Private Messages

### Insecure Direct Object Reference Exposes Private Messages
- Severity: High
- Secure implementation: Allow PM reads only when the session user is the sender or the recipient.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### Sender Spoofing in Private Messages via Client-Supplied From Field
- Severity: High
- Secure implementation: Derive the sender exclusively from the server-side session.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

## Moderation & Admin

### Missing Authorization on Moderation Action (Pin Thread)
- Severity: Medium
- Secure implementation: Require a moderator/admin role server-side for all moderation endpoints.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### Missing CSRF Protection on Administrative Ban Action
- Severity: Medium
- Secure implementation: Add per-session CSRF tokens to all administrative forms and verify request origin.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### Broken Access Control on Admin Panel Exposes All User Credentials
- Severity: Critical
- Secure implementation: Enforce admin-role authorization server-side on every admin route; never render password data.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

## Platform & API

### Weak API Authentication — Token Derived from Public Email
- Severity: High
- Secure implementation: Issue random, secret API tokens per user, store them hashed and allow revocation.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.

### Exposed Debug Endpoint Leaks Full User Database
- Severity: Critical
- Secure implementation: Remove debug endpoints from production builds; require admin auth and audit access to any diagnostics.
- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.
