# HexaConsult — Fix & Retest (LAB 98)

For every test: the professional report entry, the secure implementation, and a regression retest.

## SQL Injection in Login Form Allows Authentication Bypass
- Severity: Critical
- Feature: Login & Authentication
- Secure implementation: Use parameterised queries / prepared statements for all database access; never concatenate user input into SQL.
- Regression test: re-run the original exploit for "SQL Injection Login Bypass" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Missing Brute-Force Protection on Login
- Severity: High
- Feature: Login & Authentication
- Secure implementation: Add per-account and per-IP rate limiting, progressive delays and lockout/alerting after repeated failures.
- Regression test: re-run the original exploit for "Brute Force — No Rate Limiting or Lockout" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Account Enumeration via Differential Authentication Responses
- Severity: Medium
- Feature: Login & Authentication
- Secure implementation: Return one generic message ("invalid credentials" / "if the account exists…") for all authentication failures.
- Regression test: re-run the original exploit for "User Enumeration via Login & Forgot-Password Responses" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Live Administrative Account Uses Published Demo Credentials
- Severity: Critical
- Feature: Login & Authentication
- Secure implementation: Remove demo accounts from production, force unique strong passwords, and never print credentials on the login page.
- Regression test: re-run the original exploit for "Published Demo Credentials Are Live Admin Credentials" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Password Reset Token Is Predictable (Derived from User ID)
- Severity: High
- Feature: Login & Authentication
- Secure implementation: Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.
- Regression test: re-run the original exploit for "Predictable Password-Reset Token" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Authorization Decisions Trust a Client-Controlled Role Cookie
- Severity: High
- Feature: Login & Authentication
- Secure implementation: Derive roles from the server-side session record only; ignore role values supplied by the client.
- Regression test: re-run the original exploit for "Role Cookie Tampering into the Consultant Hub" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## No Minimum Password Strength Enforced at Registration
- Severity: Medium
- Feature: Registration & Profile
- Secure implementation: Enforce a minimum length (≥10) and screen new passwords against known-breached lists.
- Regression test: re-run the original exploit for "Weak Password Policy (1 Character Accepted)" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Mass Assignment in Registration Allows Privilege Escalation
- Severity: High
- Feature: Registration & Profile
- Secure implementation: Whitelist the exact fields a request may set; assign roles and rates server-side only.
- Regression test: re-run the original exploit for "Mass Assignment — Role & Rate Set at Registration" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Stored Cross-Site Scripting via Display Name
- Severity: High
- Feature: Registration & Profile
- Secure implementation: Contextually output-encode all user data and deploy a Content-Security-Policy as defence in depth.
- Regression test: re-run the original exploit for "Stored XSS in Display Name" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Missing CSRF Protection on Profile Update
- Severity: Medium
- Feature: Registration & Profile
- Secure implementation: Require a per-session anti-CSRF token on all state-changing requests and verify Origin/Referer.
- Regression test: re-run the original exploit for "CSRF on Profile Update" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## SQL Injection in Consultant Search Leaks Unlisted Records
- Severity: High
- Feature: Consultants & Search
- Secure implementation: Parameterise search queries and enforce the listed/unlisted filter server-side.
- Regression test: re-run the original exploit for "SQL Injection in Consultant Search" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Reflected Cross-Site Scripting in Search Results
- Severity: Medium
- Feature: Consultants & Search
- Secure implementation: Output-encode reflected data and validate search input.
- Regression test: re-run the original exploit for "Reflected XSS in Search" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Unlisted Consultant Profile Exposed via Direct URL (Missing Visibility Check)
- Severity: Medium
- Feature: Consultants & Search
- Secure implementation: Check the listed flag (or an authorisation rule) on every profile read, not only in listings.
- Regression test: re-run the original exploit for "Unlisted Consultant Profile Accessible by Direct ID" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Insecure Direct Object Reference on Appointment View
- Severity: High
- Feature: Appointments & Booking
- Secure implementation: Verify the requesting user owns (or is a party to) the appointment before serving it.
- Regression test: re-run the original exploit for "Appointment IDOR — View Another Client's Booking" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Missing Slot-Availability Check Allows Double-Booking
- Severity: Medium
- Feature: Appointments & Booking
- Secure implementation: Enforce a uniqueness check on (consultant, date, slot) server-side at booking time, inside a transaction.
- Regression test: re-run the original exploit for "Double-Booking — Same Consultant, Same Slot, Twice" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Client-Supplied Hourly Rate Trusted at Booking (Price Tampering)
- Severity: High
- Feature: Appointments & Booking
- Secure implementation: Look up the consultant's rate server-side at booking time and ignore client-supplied pricing.
- Regression test: re-run the original exploit for "Consultant Rate Tampering at Booking" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Insecure Direct Object Reference on Engagement View
- Severity: High
- Feature: Engagements
- Secure implementation: Authorise every engagement read against the engagement's client and consultant parties.
- Regression test: re-run the original exploit for "Engagement IDOR — Read Another Client's Engagement" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Missing Role Check on Milestone Approval Endpoint
- Severity: High
- Feature: Engagements
- Secure implementation: Require the assigned consultant (server-side role + party check) for milestone approval.
- Regression test: re-run the original exploit for "Client Approves Own Milestone via Consultant-Only Endpoint" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Unauthorised Engagement Cancellation (Missing Party Check)
- Severity: High
- Feature: Engagements
- Secure implementation: Restrict cancellation to engagement parties with the appropriate role, and log the action.
- Regression test: re-run the original exploit for "Cancel Another Party's Engagement" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Insecure Direct Object Reference on Deliverable Download
- Severity: High
- Feature: Reports & Deliverables
- Secure implementation: Map each file to its engagement and authorise the downloader as a party before serving it.
- Regression test: re-run the original exploit for "Deliverable Download IDOR" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Directory Traversal in File Download Allows Arbitrary File Read
- Severity: High
- Feature: Reports & Deliverables
- Secure implementation: Resolve the requested path, verify it stays inside the files directory, and prefer ID-based file lookup.
- Regression test: re-run the original exploit for "Path Traversal on Deliverable Download" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Insecure Direct Object Reference on Invoice View
- Severity: Medium
- Feature: Invoices & Payments
- Secure implementation: Authorise invoice reads against the invoice's client before serving.
- Regression test: re-run the original exploit for "Invoice IDOR — View Another Client's Invoice" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Client-Supplied Payment Amount Trusted; Invoice Marked Paid in Full
- Severity: Critical
- Feature: Invoices & Payments
- Secure implementation: Compare the paid amount against the server-side invoice total in the payment callback; only then mark PAID.
- Regression test: re-run the original exploit for "Invoice Payment Amount Tampering ($1 Settles $4,000)" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Broken Access Control: Admin Panel Served to Non-Admin Users
- Severity: Critical
- Feature: Admin Panel
- Secure implementation: Enforce an admin-role check in middleware for all /admin routes.
- Regression test: re-run the original exploit for "Admin Panel Open to Any Logged-In User" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Forgeable API Token (base64 of Email) Allows Account Data Access
- Severity: High
- Feature: Platform & API
- Secure implementation: Issue random, server-stored API tokens (hashed at rest) and verify them on every API call.
- Regression test: re-run the original exploit for "API Token Is Just base64(email)" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.

## Unauthenticated Debug Endpoint Exposes Full User Table
- Severity: Critical
- Feature: Platform & API
- Secure implementation: Remove debug endpoints from production builds; gate any diagnostics behind admin auth.
- Regression test: re-run the original exploit for "Unauthenticated /api/debug Dumps All Accounts" — it must now fail (no effect recorded, test must not flip on a fresh instance), while the legitimate workflow still works.
