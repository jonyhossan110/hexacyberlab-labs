# HexaManufacture (LAB 104) — Fix & Retest Guide

For every scored test: the professional report entry, the secure implementation direction, and the regression test.

## SQL Injection in Login Form Allows Authentication Bypass
- **Test:** SQL Injection Login Bypass (Login & Authentication)
- **Severity:** Critical
- **Fix:** Use parameterised queries / prepared statements for all database access and validate input server-side.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Missing Brute-Force Protection on Authentication Endpoint
- **Test:** No Brute-Force Protection on Login (Login & Authentication)
- **Severity:** High
- **Fix:** Add rate limiting, progressive delays and account lockout/alerting after repeated failures.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Account Enumeration Through Differential Authentication Responses
- **Test:** User Enumeration via Login & Forgot-Password Responses (Login & Authentication)
- **Severity:** Medium
- **Fix:** Return one generic response for all login and password-reset outcomes.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Default/Demo Credentials Published and Active
- **Test:** Published Demo / Default Credentials (Login & Authentication)
- **Severity:** High
- **Fix:** Remove demo accounts and published credentials; enforce unique strong passwords at setup.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Predictable Password Reset Token Enables Account Takeover
- **Test:** Predictable Password-Reset Token (Login & Authentication)
- **Severity:** Critical
- **Fix:** Generate reset tokens with a CSPRNG, store only a hash, expire them quickly and make them single-use.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Broken Access Control — Role Trusted From Client Cookie
- **Test:** Role Cookie Tampering (Client-Side Role Trust) (Login & Authentication)
- **Severity:** High
- **Fix:** Derive roles only from the server-side session; never trust client-supplied role values.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Weak Password Policy on Registration
- **Test:** Weak Password Policy (1-Character Passwords) (Registration & Profile)
- **Severity:** Medium
- **Fix:** Enforce a minimum length of 12+ characters and block common/breached passwords.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Mass Assignment Allows Privilege Escalation at Registration
- **Test:** Mass Assignment — Self-Assign Admin Role at Registration (Registration & Profile)
- **Severity:** Critical
- **Fix:** Whitelist assignable fields server-side; never accept role or balance fields from clients.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Stored Cross-Site Scripting via Display Name
- **Test:** Stored XSS in Display Name (Registration & Profile)
- **Severity:** High
- **Fix:** Context-encode all user output and apply a strict Content-Security-Policy.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Cross-Site Request Forgery on Profile Update
- **Test:** CSRF on Profile Update (Registration & Profile)
- **Severity:** Medium
- **Fix:** Require a per-session CSRF token on all state-changing requests and set SameSite cookies.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## SQL Injection in Search Exposes Confidential Records
- **Test:** SQL Injection in Search Leaks Confidential Work Orders (Search & Catalogue)
- **Severity:** High
- **Fix:** Parameterise search queries and enforce record visibility in the data layer.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Reflected Cross-Site Scripting in Search Results
- **Test:** Reflected XSS in Search (Search & Catalogue)
- **Severity:** Medium
- **Fix:** Encode reflected values and validate input; add a Content-Security-Policy.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Insecure Direct Object Reference on Work Order Details
- **Test:** Work Order IDOR — View Another Operator’s Work Order (Work Orders)
- **Severity:** High
- **Fix:** Enforce per-object authorization checks on every record access.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Unauthorised Modification of Work Order Quantities
- **Test:** Work Order Quantity Tampering by Non-Owner (Work Orders)
- **Severity:** High
- **Fix:** Authorize updates per record and validate quantities against business rules server-side.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Missing Authorization on Work Order Completion
- **Test:** Work Order Completion Without Manager/QC Authority (Work Orders)
- **Severity:** High
- **Fix:** Restrict completion to manager role and require a passed QC check first.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Confidential Work Order Accessible by Direct URL (IDOR)
- **Test:** Confidential Internal Work Order Exposed by Direct URL (Work Orders)
- **Severity:** High
- **Fix:** Apply the same visibility/authorization checks to direct access as to listings.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Missing Role Check on Inventory Adjustment
- **Test:** Stock Adjustment by Non-Manager (Broken Access Control) (Inventory & Materials)
- **Severity:** High
- **Fix:** Enforce manager-only authorization on stock adjustments and log all changes.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Insufficient Validation Allows Negative Inventory
- **Test:** Material Issue Drives Stock Negative (Missing Validation) (Inventory & Materials)
- **Severity:** Medium
- **Fix:** Validate issue quantities against current stock in a transaction and reject over-issues.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Client-Side Price Tampering on Purchase Orders
- **Test:** Purchase Order Price Tampering (Inventory & Materials)
- **Severity:** High
- **Fix:** Compute prices server-side from the item catalogue; ignore client-supplied prices.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Missing Separation of Duties — QC Self-Approval
- **Test:** QC Self-Approval (Inspector Approves Own Check) (Quality Control)
- **Severity:** High
- **Fix:** Require a different QC-role user to approve checks and enforce it server-side.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Unauthorised Modification of Quality Check Results
- **Test:** QC Result Tampering — Fail Changed to Pass by Operator (Quality Control)
- **Severity:** Critical
- **Fix:** Restrict result changes to the QC role and keep an immutable audit history.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Missing Ownership Check on Maintenance Ticket Closure
- **Test:** Close Another Technician’s Maintenance Ticket (Maintenance)
- **Severity:** Medium
- **Fix:** Allow closure only by the assignee or a manager, and log who closed each ticket.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Broken Access Control Exposes User List With Passwords
- **Test:** Admin User List (With Passwords) Open to Any User (Admin Panel)
- **Severity:** Critical
- **Fix:** Enforce admin-role checks on all admin endpoints and never render stored passwords.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Cross-Site Request Forgery on User Deactivation
- **Test:** CSRF on Admin User Deactivation (Admin Panel)
- **Severity:** Medium
- **Fix:** Require CSRF tokens on all admin actions and re-check authorization server-side.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Sensitive Data Exposure via Unauthenticated Debug Endpoint
- **Test:** Unauthenticated Debug Endpoint Dumps All Data (Platform & API)
- **Severity:** Critical
- **Fix:** Remove debug endpoints from production builds and require auth + role checks on diagnostics.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.

## Weak API Authentication — Token Derived From Email
- **Test:** API Token Is Just Base64 of the User’s Email (Platform & API)
- **Severity:** High
- **Fix:** Issue random, server-stored API tokens per user and verify them server-side on every call.
- **Regression test:** Re-run the original exploit exactly as practised — it must now fail (no session, no record change, no data returned). Then run the legitimate flow and confirm it still works.
