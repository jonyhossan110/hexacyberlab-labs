# HexaProperty (LAB 91) — Fix & Retest

For every test: the secure implementation, and the regression check that proves the fix.

## SQL Injection in Login Form Allows Authentication Bypass (Critical)
- Secure implementation: Use parameterised queries / prepared statements for all database access; never concatenate user input into SQL.
- Regression test: re-run the original exploit for "SQL Injection Login Bypass" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Missing Brute-Force Protection on Authentication Endpoint (High)
- Secure implementation: Add per-account and per-IP rate limiting, progressive delays and lockout/alerting after repeated failures.
- Regression test: re-run the original exploit for "No Brute-Force Protection on Login" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Account Enumeration Through Differential Authentication Responses (Medium)
- Secure implementation: Return one generic message for all login and reset outcomes, regardless of whether the account exists.
- Regression test: re-run the original exploit for "User Enumeration via Login and Reset Responses" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Password Reset Token Is Predictable (Derived from Account ID) (High)
- Secure implementation: Generate reset tokens with a CSPRNG (at least 128 bits), store only a hash, expire quickly and make them single-use.
- Regression test: re-run the original exploit for "Predictable Password-Reset Token" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Working Demo Credentials Disclosed on the Login Page (Medium)
- Secure implementation: Remove published/demo credentials from production; disable default accounts or force unique passwords.
- Regression test: re-run the original exploit for "Demo Credentials Published on the Login Page" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Authorization Role Taken from a Client-Controlled Cookie (High)
- Secure implementation: Store roles only in server-side session state; ignore role claims arriving from the client.
- Regression test: re-run the original exploit for "Role Trusted from a Client Cookie (hx_role)" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## No Server-Side Minimum Password Strength at Registration (Medium)
- Secure implementation: Enforce a server-side password policy (length and breach-list checks) on registration and password change.
- Regression test: re-run the original exploit for "Weak Password Policy at Registration" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Mass Assignment in Registration Allows Role and Credit Manipulation (High)
- Secure implementation: Whitelist the exact fields registration may set; assign roles and credits only through server-side logic.
- Regression test: re-run the original exploit for "Mass Assignment at Registration (role / featuredCredits)" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Stored Cross-Site Scripting via Display Name (High)
- Secure implementation: Contextually encode all user-supplied data on output and validate input; add a Content-Security-Policy as defence in depth.
- Regression test: re-run the original exploit for "Stored XSS in Display Name" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Missing CSRF Verification on Profile Update (Medium)
- Secure implementation: Require and verify a per-session CSRF token on all state-changing requests; use SameSite cookies as a backstop.
- Regression test: re-run the original exploit for "CSRF on Profile Update" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## SQL Injection in Search Exposes Unpublished Listings (High)
- Secure implementation: Parameterise the search query and enforce listing-status filters in server-side code, not in the query string alone.
- Regression test: re-run the original exploit for "SQL Injection in Property Search Leaks Draft Listings" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Reflected Cross-Site Scripting in Search (Medium)
- Secure implementation: HTML-encode the reflected search term and validate input; deploy a Content-Security-Policy.
- Regression test: re-run the original exploit for "Reflected XSS in Search Results" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Insecure Direct Object Reference Exposes Draft Listing and Internal Notes (High)
- Secure implementation: Check listing status and the requester’s relationship to it on every object access; never render internal notes to buyers.
- Regression test: re-run the original exploit for "Unpublished (Draft) Listing Visible by Direct URL" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Missing Ownership Check Allows Editing Any Listing (High)
- Secure implementation: Enforce per-object authorization on the server for every read and write of a listing.
- Regression test: re-run the original exploit for "Edit Another Owner's Listing (Broken Access Control)" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Client-Supplied Price Trusted for Featured Listing Upgrade (Medium)
- Secure implementation: Look up the price server-side from the listing/plan; ignore any amount sent by the client.
- Regression test: re-run the original exploit for "Featured-Listing Price Tampering" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Unrestricted File Upload Allows HTML/JS Hosting on the Application Domain (High)
- Secure implementation: Whitelist image types by content inspection, rename files, store outside the web root and serve with safe headers.
- Regression test: re-run the original exploit for "Unrestricted File Upload — HTML Served from the Portal" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Insecure Direct Object Reference Exposes Buyer Contact Details (High)
- Secure implementation: Authorize inquiry access to the sender, the listing owner and admins only; audit access to personal data.
- Regression test: re-run the original exploit for "Read Another Buyer's Inquiry with Private Contact Details" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Missing Authorization on Inquiry Deletion (Medium)
- Secure implementation: Check that the caller is the sender, the listing owner or an admin before deleting; log destructive actions.
- Regression test: re-run the original exploit for "Delete an Inquiry on Someone Else's Listing" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Viewing Slot Can Be Booked by Multiple Buyers (Missing Uniqueness Check) (Medium)
- Secure implementation: Enforce one active appointment per listing/slot on the server and reject conflicts atomically.
- Regression test: re-run the original exploit for "Double-Booking the Same Viewing Slot" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Missing Authorization Allows Cancelling Any Appointment (Medium)
- Secure implementation: Authorize cancel actions to the appointment’s buyer, the listing owner or an admin.
- Regression test: re-run the original exploit for "Cancel Another Buyer's Viewing Appointment" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Broken Function-Level Authorization on Appointment Confirmation (Medium)
- Secure implementation: Restrict the confirm transition to the listing owner, assigned agent or admin, checked server-side.
- Regression test: re-run the original exploit for "Buyer Confirms Own Appointment via the Agent/Owner Action" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Insecure Direct Object Reference on Saved Searches (Medium)
- Secure implementation: Scope saved-search reads to their owner; return 404 for other users’ objects.
- Regression test: re-run the original exploit for "Read Another User's Saved Search and Alert Email" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Broken Access Control on Admin Panel (Any Authenticated User) (Critical)
- Secure implementation: Require a server-side admin role check on all admin routes; remove password display entirely.
- Regression test: re-run the original exploit for "Admin Panel Open to Any Signed-In User" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Missing CSRF Verification on Administrative Actions (High)
- Secure implementation: Verify per-session CSRF tokens on all admin POSTs and require re-authentication for destructive actions.
- Regression test: re-run the original exploit for "CSRF on Admin User Deactivation" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## API Authentication Uses Base64-Encoded Email as the Key (High)
- Secure implementation: Issue random, revocable API tokens per account, store hashes, and require them over TLS only.
- Regression test: re-run the original exploit for "Weak API Key — Base64 of the Account Email" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.

## Exposed Debug Endpoint Discloses All User Credentials (Critical)
- Secure implementation: Remove debug endpoints from production builds; gate diagnostics behind admin auth and network restrictions.
- Regression test: re-run the original exploit for "Unauthenticated Debug Endpoint Dumps All Accounts" — it must now fail (no test progress, no data change) — then confirm the legitimate flow still works for authorised users.
