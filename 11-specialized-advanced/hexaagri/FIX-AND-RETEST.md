# HexaAgri — Fix & Retest Notes (LAB 105)

For every scored test: how it is written in a real client report, the secure implementation, and a regression retest.

## SQL Injection in Login Form Allows Authentication Bypass
- **Severity:** Critical
- **Feature:** Login & Authentication
- **Secure implementation / remediation:** Use parameterised queries / prepared statements for all database access and validate input server-side.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Missing Brute-Force Protection on Authentication
- **Severity:** High
- **Feature:** Login & Authentication
- **Secure implementation / remediation:** Add per-account rate limiting, progressive delays and lockout/alerting after repeated failures.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Account Enumeration Through Differential Authentication Responses
- **Severity:** Medium
- **Feature:** Login & Authentication
- **Secure implementation / remediation:** Return one generic message for all login and reset outcomes regardless of account existence.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Active Demo Account With Widely Known Default Credentials
- **Severity:** High
- **Feature:** Login & Authentication
- **Secure implementation / remediation:** Remove demo accounts from production and force unique strong passwords at first sign-in.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Predictable Password Reset Tokens Allow Account Takeover
- **Severity:** Critical
- **Feature:** Login & Authentication
- **Secure implementation / remediation:** Issue single-use, time-limited reset tokens from a CSPRNG and store only a hash server-side.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Broken Access Control — Privilege Escalation via Client-Side Role Cookie
- **Severity:** High
- **Feature:** Login & Authentication
- **Secure implementation / remediation:** Derive roles exclusively from the server-side session; ignore role claims from the client.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Weak Password Policy Allows Trivial Passwords
- **Severity:** Medium
- **Feature:** Registration & Profile
- **Secure implementation / remediation:** Enforce a minimum length of 10+ characters and screen against common-password lists.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Mass Assignment in Registration Allows Privilege Escalation
- **Severity:** High
- **Feature:** Registration & Profile
- **Secure implementation / remediation:** Whitelist assignable fields per endpoint and set roles/balances only in server-side logic.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Stored Cross-Site Scripting via Display Name
- **Severity:** High
- **Feature:** Registration & Profile
- **Secure implementation / remediation:** Contextually encode all user output and apply a Content Security Policy.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Insecure Direct Object Reference on Farm Records
- **Severity:** High
- **Feature:** Farms & Search
- **Secure implementation / remediation:** Check object ownership/authorization on every request server-side.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## SQL Injection in Search Function
- **Severity:** High
- **Feature:** Farms & Search
- **Secure implementation / remediation:** Use parameterised queries for search and encode LIKE wildcards in user input.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Reflected Cross-Site Scripting in Search Results
- **Severity:** Medium
- **Feature:** Farms & Search
- **Secure implementation / remediation:** Encode all reflected values in HTML context and validate input.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Missing Authorization on Crop Edit Endpoint
- **Severity:** High
- **Feature:** Crops & Fields
- **Secure implementation / remediation:** Verify the session user owns the parent farm before applying any crop change.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Missing Validation Allows Yield Figure Manipulation
- **Severity:** Medium
- **Feature:** Crops & Fields
- **Secure implementation / remediation:** Enforce server-side plausibility ranges per crop/field and audit large changes.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Broken Access Control on Field Harvest Action
- **Severity:** High
- **Feature:** Crops & Fields
- **Secure implementation / remediation:** Authorize the actor against the field's farm before processing a harvest.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Unrestricted Inventory Adjustment Allows Stock Inflation
- **Severity:** High
- **Feature:** Harvest Inventory
- **Secure implementation / remediation:** Restrict adjustments by role, require reasons, cap deltas and keep an immutable audit log.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Missing Input Validation Allows Negative Inventory
- **Severity:** Medium
- **Feature:** Harvest Inventory
- **Secure implementation / remediation:** Validate quantities as positive numbers within business limits on the server.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Price Tampering in Order Placement
- **Severity:** Critical
- **Feature:** Sales & Orders
- **Secure implementation / remediation:** Ignore client-supplied prices; compute totals from server-side catalogue data.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Missing Stock Check Allows Overselling
- **Severity:** High
- **Feature:** Sales & Orders
- **Secure implementation / remediation:** Validate ordered quantity against available stock atomically before confirming.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Insecure Direct Object Reference on Sales Orders
- **Severity:** Medium
- **Feature:** Sales & Orders
- **Secure implementation / remediation:** Restrict order visibility to the buyer, the selling farm and admins.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Insecure Direct Object Reference on Invoices
- **Severity:** Medium
- **Feature:** Sales & Orders
- **Secure implementation / remediation:** Authorize invoice access to the paying buyer and issuing farm only.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Missing Role Check Allows Self-Approval of Maintenance Requests
- **Severity:** High
- **Feature:** Equipment & Maintenance
- **Secure implementation / remediation:** Require manager role for approvals and prevent requesters approving their own requests.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Privilege Escalation via Unprotected Role-Change Endpoint
- **Severity:** Critical
- **Feature:** Workers & Subsidies
- **Secure implementation / remediation:** Restrict role changes to admins and log every change.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Missing Authorization Allows Self-Approval of Subsidies
- **Severity:** Critical
- **Feature:** Workers & Subsidies
- **Secure implementation / remediation:** Require manager/admin approval from a different user than the applicant.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Cross-Site Request Forgery on Admin User Deactivation
- **Severity:** High
- **Feature:** Admin & Platform
- **Secure implementation / remediation:** Require per-session CSRF tokens on all state-changing endpoints and verify Origin/Referer.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.

## Unauthenticated Debug Endpoint Discloses Full Database
- **Severity:** Critical
- **Feature:** Admin & Platform
- **Secure implementation / remediation:** Remove debug endpoints from production and protect diagnostics with admin auth.
- **Regression retest:** Re-run the original exploit after the fix — it must fail (no session created, no foreign object served, no state changed) — then confirm the legitimate flow still works for an authorized user.
