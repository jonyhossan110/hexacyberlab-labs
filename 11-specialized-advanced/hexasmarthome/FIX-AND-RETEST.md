# HexaSmartHome (LAB 102) — Fix & Retest Guide

For every scored test: the secure implementation and a regression check. After fixing, re-run the exploit — it must fail — then re-run the normal flow — it must still work.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- Fix: Use parameterised queries / prepared statements for all database access and never build SQL by string concatenation.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

### No Rate Limiting or Account Lockout on Login (High)
- Fix: Add progressive delays/lockout after repeated failures, alert the account owner, and offer MFA.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

### Account Enumeration via Differential Authentication Responses (Medium)
- Fix: Return one generic message ("invalid credentials" / "if the account exists…") for every failure case.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

### Demo Account Credentials Published on the Login Page (Medium)
- Fix: Remove demo credentials from production, disable demo accounts, and force unique strong passwords.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

### Password Reset Token Is Predictable (Derived from User ID) (High)
- Fix: Generate reset tokens with a CSPRNG (128+ bits), store hashes, expire them quickly and make them single-use.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

### Admin Authorisation Based on a Client-Controlled Cookie (Critical)
- Fix: Derive roles from the server-side session record only; never trust role claims in cookies or form fields.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

## Registration & Profile

### No Minimum Password Strength Enforced at Registration (Medium)
- Fix: Enforce a minimum length (12+) and screen against breached-password lists.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

### Mass Assignment Allows Privilege Escalation at Registration (Critical)
- Fix: Whitelist assignable fields on registration/profile endpoints and set roles only server-side.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

### Stored Cross-Site Scripting via Display Name (High)
- Fix: Contextually output-encode all user data and add a Content-Security-Policy header.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

### Missing CSRF Protection on Profile Update (Medium)
- Fix: Require a per-session CSRF token on all state-changing requests and verify Origin/Referer.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

## Homes & Rooms

### Insecure Direct Object Reference on Home Dashboard (High)
- Fix: Check household membership on every home-scoped route and return 404/403 for non-members.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

### SQL Injection in Home Search Exposes Unlisted Properties (High)
- Fix: Parameterise search queries and enforce the listed/visibility filter server-side.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

### Reflected Cross-Site Scripting in Search Results (Medium)
- Fix: Output-encode reflected parameters and deploy a Content-Security-Policy.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

## Devices & Control

### Missing Authorisation on Device Control Endpoint (Cross-Household) (Critical)
- Fix: Authorise every control action against household membership and log cross-household attempts.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

### View-Only Guests Can Control Devices (Missing Permission Check) (High)
- Fix: Enforce membership permission (owner/member) on all device control routes.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

### Insecure Direct Object Reference on Camera Device Page (High)
- Fix: Verify household membership before serving any device page, especially cameras.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

### Stored Cross-Site Scripting via Device Name (High)
- Fix: Output-encode device names in every view (dashboard, logs, admin) and validate name length/characters.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

### API Authentication Token Is Simply base64(email) (High)
- Fix: Issue random, revocable API tokens, store them hashed, and scope them per household.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

## Members & Invites

### Role Escalation via Mass Assignment on Invite Acceptance (Critical)
- Fix: Assign the role stored on the invite record; ignore any role supplied by the client.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

### Invite Acceptance Trusts Predictable, Unissued Codes (High)
- Fix: Generate invite codes with a CSPRNG, verify them against issued invites only, expire and single-use them.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

### Missing Authorisation on Member Removal Allows Owner Ejection (High)
- Fix: Restrict member management to owners and forbid removing the home owner.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

## Scenes & Automations

### Missing Authorisation on Scene Execution Endpoint (High)
- Fix: Authorise scene execution against the scene's household membership.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

### Missing CSRF Protection on Automation Deletion (Medium)
- Fix: Require per-session CSRF tokens on all state-changing endpoints.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

## Activity & Privacy

### Insecure Direct Object Reference on Household Activity Log (High)
- Fix: Restrict activity logs to household members and minimise retained event detail.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

## Admin Panel

### Broken Access Control on Admin User List Endpoint (Passwords Exposed) (Critical)
- Fix: Require the admin role on the endpoint itself and never return password material in any response.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.

## Platform & API

### Unauthenticated Debug Endpoint Exposes Full Platform Data (Critical)
- Fix: Remove debug endpoints from production builds and gate diagnostics behind admin authentication.
- Retest: repeat the original exploit steps from the Practice Guide; the test condition must no longer occur, and legitimate use of the feature must still succeed.
