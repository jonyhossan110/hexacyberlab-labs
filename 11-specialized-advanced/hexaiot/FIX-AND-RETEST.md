# HexaIoT — Fix & Retest Guide (LAB 101)

For every scored test: how it is written in a real client report, the secure implementation, and the regression test that proves the fix.

## SQL Injection in Login Form Allows Authentication Bypass
- Feature: Login & Authentication
- Severity: Critical
- Secure implementation: Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.
- Regression test: Repeat the original exploit (POST /login) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Login Endpoint Has No Brute-Force Protection
- Feature: Login & Authentication
- Severity: High
- Secure implementation: Add per-account and per-IP rate limiting, progressive delays and lockout/alerting after repeated failures.
- Regression test: Repeat the original exploit (POST /login) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Username Enumeration via Authentication Error Messages
- Feature: Login & Authentication
- Severity: Medium
- Secure implementation: Return one generic "invalid credentials" message for all login and password-reset failures.
- Regression test: Repeat the original exploit (POST /login and POST /forgot) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Default/Demo Administrator Credentials Active and Published
- Feature: Login & Authentication
- Severity: Critical
- Secure implementation: Remove demo accounts from production, force unique strong passwords, and never print credentials on the login page.
- Regression test: Repeat the original exploit (POST /login) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Password Reset Tokens Are Predictable
- Feature: Login & Authentication
- Severity: High
- Secure implementation: Generate reset tokens with a CSPRNG (at least 128 bits), store them hashed, and expire them quickly.
- Regression test: Repeat the original exploit (POST /reset) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Authorization Role Taken from a Client-Controlled Cookie
- Feature: Login & Authentication
- Severity: High
- Secure implementation: Derive roles from the server-side session record on every request; never trust client-supplied role values.
- Regression test: Repeat the original exploit (GET /admin) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## No Minimum Password Strength on Registration
- Feature: Registration & Profile
- Severity: Medium
- Secure implementation: Enforce a minimum password length (12+ recommended) and screen against known-breached passwords.
- Regression test: Repeat the original exploit (POST /register) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Mass Assignment Allows Privilege Escalation at Registration
- Feature: Registration & Profile
- Severity: High
- Secure implementation: Whitelist the exact fields each endpoint may set; assign roles and plans server-side only.
- Regression test: Repeat the original exploit (POST /register) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Stored Cross-Site Scripting via Display Name
- Feature: Registration & Profile
- Severity: High
- Secure implementation: Contextually escape all user-supplied output and validate/sanitise display names on input.
- Regression test: Repeat the original exploit (POST /register or POST /profile, rendered on /team) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Missing CSRF Protection on Profile Update
- Feature: Registration & Profile
- Severity: Medium
- Secure implementation: Require a per-session anti-CSRF token on all state-changing requests and verify Origin/Referer as defence in depth.
- Regression test: Repeat the original exploit (POST /profile) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## SQL Injection in Device Search Exposes Unlisted Devices
- Feature: Devices & Search
- Severity: High
- Secure implementation: Parameterise search queries and enforce the listed/visibility filter server-side, not inside the user-controlled query.
- Regression test: Repeat the original exploit (GET /devices?q=) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Reflected Cross-Site Scripting in Device Search
- Feature: Devices & Search
- Severity: Medium
- Secure implementation: Escape all reflected values in HTML output and deploy a restrictive Content-Security-Policy.
- Regression test: Repeat the original exploit (GET /devices?q=) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Insecure Direct Object Reference on Device Detail Pages
- Feature: Devices & Search
- Severity: High
- Secure implementation: Verify object ownership (or a sharing grant) on every device request before returning data.
- Regression test: Repeat the original exploit (GET /devices/<id>) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Insecure Direct Object Reference on Device Telemetry
- Feature: Telemetry
- Severity: High
- Secure implementation: Enforce ownership checks on telemetry endpoints exactly as on the parent device.
- Regression test: Repeat the original exploit (GET /devices/<id>/telemetry) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Telemetry Ingest Allows Spoofed Readings for Arbitrary Devices
- Feature: Telemetry
- Severity: High
- Secure implementation: Require per-device credentials for telemetry ingest and verify the caller owns/controls the target device.
- Regression test: Repeat the original exploit (POST /devices/<id>/telemetry) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Missing Authorization on Remote Device Command Endpoint
- Feature: Remote Commands
- Severity: Critical
- Secure implementation: Verify device ownership server-side before accepting any command, and log all command activity per device.
- Regression test: Repeat the original exploit (POST /devices/<id>/command) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Insecure Direct Object Reference on Device Command History
- Feature: Remote Commands
- Severity: Medium
- Secure implementation: Apply ownership checks to command-history endpoints.
- Regression test: Repeat the original exploit (GET /devices/<id>/commands) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Firmware Version Settable by Client Input
- Feature: Firmware & Updates
- Severity: Medium
- Secure implementation: Accept firmware changes only from the signed OTA update flow; ignore firmware fields in general update forms.
- Regression test: Repeat the original exploit (POST /devices/<id>/update) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Unlisted Firmware Records Accessible by Direct ID
- Feature: Firmware & Updates
- Severity: Medium
- Secure implementation: Restrict unreleased firmware records to internal roles and check visibility on the detail endpoint.
- Regression test: Repeat the original exploit (GET /firmware/<id>) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Private Group Contents Exposed to Non-Members
- Feature: Groups & Sharing
- Severity: High
- Secure implementation: Check group membership before rendering private group pages and device lists.
- Regression test: Repeat the original exploit (GET /groups/<id>) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Group Invitation Tokens Are Predictable
- Feature: Groups & Sharing
- Severity: High
- Secure implementation: Generate invite tokens with a CSPRNG, store them hashed, and support expiry and revocation.
- Regression test: Repeat the original exploit (GET /groups/join?token=) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Insecure Direct Object Reference on Alert Details
- Feature: Alerts
- Severity: Medium
- Secure implementation: Check alert ownership before returning alert details.
- Regression test: Repeat the original exploit (GET /alerts/<id>) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Missing Authorization on Alert Acknowledge Action
- Feature: Alerts
- Severity: High
- Secure implementation: Verify the caller owns the alert before allowing acknowledge/dismiss actions, and audit all such actions.
- Regression test: Repeat the original exploit (POST /alerts/<id>/ack) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Broken Access Control on Admin User Export (Passwords Exposed)
- Feature: Admin & Platform
- Severity: Critical
- Secure implementation: Require the admin role on all /admin routes and never return password values in any response.
- Regression test: Repeat the original exploit (GET /admin/users.json) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Unauthenticated Debug Endpoint Exposes All User Data
- Feature: Admin & Platform
- Severity: Critical
- Secure implementation: Remove debug endpoints from production builds; gate any diagnostics behind admin authentication.
- Regression test: Repeat the original exploit (GET /api/debug) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.

## Device API Token Is a Predictable Encoding of the User Email
- Feature: Admin & Platform
- Severity: High
- Secure implementation: Issue random per-device API keys, store them hashed, and support rotation and revocation.
- Regression test: Repeat the original exploit (GET /api/devices with header x-api-token) after the fix; it must fail, the affected test must stay open on a fresh lab run, and normal use of the feature must still work.
