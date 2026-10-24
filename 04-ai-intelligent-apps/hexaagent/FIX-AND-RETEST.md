# HexaAgent — Fix & Retest (LAB 35)

For every scored test: the secure implementation and the regression check that proves the fix.

## Login & Authentication

### SQL Injection in Legacy SSO Login (Critical)
- **Fix:** Use parameterised queries everywhere and remove the legacy concatenated login path.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Missing Brute-Force Protection on Login (High)
- **Fix:** Add per-account and per-IP rate limiting, progressive delays and lockout/alerting after repeated failures.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### User Enumeration Through Authentication Error Messages (Medium)
- **Fix:** Return one generic "invalid credentials" message for every failed login.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Default/Demo Account With Guessable Password (High)
- **Fix:** Remove demo accounts from production or force strong unique passwords and disable them by default.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Predictable Password Reset Token (Critical)
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Authorization Role Trusted From Client Cookie (Critical)
- **Fix:** Derive roles only from the server-side session record; never trust client-supplied role values.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

## Registration & Profile

### No Minimum Password Strength on Registration (Medium)
- **Fix:** Enforce a minimum length (≥10) and screen against common/breached password lists.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Mass Assignment Allows Privilege Escalation at Registration (Critical)
- **Fix:** Whitelist bindable fields on registration; assign roles only through admin-controlled flows.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Stored Cross-Site Scripting in Display Name (High)
- **Fix:** Contextually escape all user-controlled output and add a Content-Security-Policy.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Missing CSRF Protection on Profile Update (Medium)
- **Fix:** Require and verify a per-session anti-CSRF token on every state-changing request.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

## Agents & Sharing

### Insecure Direct Object Reference on Agent Pages (High)
- **Fix:** Enforce per-object authorization on every agent view.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Sensitive Agent Instructions Exposed Through API (High)
- **Fix:** Filter response fields by ownership and role on every API endpoint.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Missing Authorization on Agent Edit/Delete (High)
- **Fix:** Verify ownership (or an explicit grant) before any agent modification.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Guessable Share Tokens for Agents (Medium)
- **Fix:** Use ≥128-bit random share tokens and rate-limit token lookups.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Reflected Cross-Site Scripting in Agent Search (Medium)
- **Fix:** Escape reflected values and validate search input.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

## Tools & Permissions

### Tool Permission Level Changeable by Non-Owners (High)
- **Fix:** Restrict tool permission changes to the agent owner or admins, and audit them.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Missing Authorization on Tool Configuration (High)
- **Fix:** Enforce agent ownership on every tool configuration change.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### High-Risk Tool Approval Not Enforced at Execution (Critical)
- **Fix:** Block execution of high-risk tools until an admin approval is recorded server-side.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Server-Side Request Forgery in Web Fetch Tool (High)
- **Fix:** Allowlist fetch destinations, block private/loopback ranges and re-validate redirects.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

## Task Runs

### Insecure Direct Object Reference on Task Runs (High)
- **Fix:** Enforce ownership checks on run pages and log endpoints.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Unauthenticated Access to Run Logs (High)
- **Fix:** Require authentication and ownership checks on log endpoints; remove raw debug routes from production.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Direct Prompt Injection Leading to System Prompt Disclosure (High)
- **Fix:** Keep secrets out of prompts, add instruction-hierarchy guardrails and filter outputs for prompt content.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Indirect Prompt Injection Through Retrieved Documents (High)
- **Fix:** Sanitise and sandbox retrieved content, mark it as untrusted data, and monitor agent outputs.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

## Admin & Platform

### Admin User Deletion Performed via GET (CSRF) (High)
- **Fix:** Use POST with anti-CSRF tokens for all state-changing admin actions.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Unauthenticated Debug Endpoint Exposing Users and API Keys (Critical)
- **Fix:** Remove debug endpoints from production builds entirely.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.

### Predictable API Key Derived From Email Address (High)
- **Fix:** Accept only randomly generated API keys, stored hashed, with rotation support.
- **Retest:** repeat the original exploit from the practice guide — it must now fail (no test progress is awarded, no effect occurs), while the legitimate workflow still works.
