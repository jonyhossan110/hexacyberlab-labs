# HexaCreator — Fix & Retest (LAB 87)

For every scored test: the professional report entry, the secure implementation, and the regression test that proves the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- **Severity:** Critical
- **Secure implementation:** Use parameterised queries / prepared statements for all database access and validate input server-side.
- **Regression test:** Repeat the original exploit (Submit the login form with an injection payload in the email field so the credential check is bypassed and a session is issued without the real password.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

### Missing Brute-Force Protection on Login
- **Severity:** High
- **Secure implementation:** Add progressive rate limiting, account lockout and MFA; alert on repeated failures.
- **Regression test:** Repeat the original exploit (Send repeated failed logins for one account and observe that attempts are never throttled or locked.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

### Account Enumeration via Authentication Error Messages
- **Severity:** Medium
- **Secure implementation:** Return one generic message for all authentication and recovery failures.
- **Regression test:** Repeat the original exploit (Probe multiple distinct emails and compare responses to learn which emails own accounts.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

### Active Demo Accounts with Published Credentials
- **Severity:** High
- **Secure implementation:** Remove demo accounts from production or force unique, unguessable credentials and disable password login for them.
- **Regression test:** Repeat the original exploit (Read the demo credentials published on the login page and sign in with them.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

### Predictable Password Reset Token Allows Account Takeover
- **Severity:** Critical
- **Secure implementation:** Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and make them single-use.
- **Regression test:** Repeat the original exploit (Derive the deterministic reset token from the victim user id and set a new password without access to their email.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

### Client-Controlled Role Cookie Used for Authorisation
- **Severity:** High
- **Secure implementation:** Derive roles from the server-side session on every request; never trust role claims in cookies.
- **Regression test:** Repeat the original exploit (Forge the role cookie so a low-privilege session is treated as a creator by the studio gate.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

## Registration & Profile

### Registration Accepts 1-Character Passwords
- **Severity:** Medium
- **Secure implementation:** Enforce a minimum length (≥10) and screen new passwords against known-breached lists.
- **Regression test:** Repeat the original exploit (Create an account with a password far below any sane minimum and observe it is accepted.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

### Mass Assignment in Registration Allows Privilege Escalation
- **Severity:** High
- **Secure implementation:** Allow-list bindable registration fields server-side; set role and balance only from server logic.
- **Regression test:** Repeat the original exploit (Add privileged fields to the registration request and observe the new account is created with them applied.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

### Stored Cross-Site Scripting via Display Name
- **Severity:** High
- **Secure implementation:** Context-encode all user output and validate names against a strict allow-list.
- **Regression test:** Repeat the original exploit (Store a script payload in the display name so it is saved and rendered raw to other visitors.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

### Missing CSRF Protection on Profile Update
- **Severity:** Medium
- **Secure implementation:** Require a per-session anti-CSRF token on all state-changing requests and verify Origin/Referer.
- **Regression test:** Repeat the original exploit (Submit a profile change that carries no origin marker, as a cross-site request would, and observe it is accepted.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

## Creators & Search

### SQL Injection in Creator Search Exposes Unlisted Pages
- **Severity:** High
- **Secure implementation:** Parameterise search queries and enforce listing visibility in the data layer, not the template.
- **Regression test:** Repeat the original exploit (Inject into the creator search so the result set includes the unlisted page that normal search never returns.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

### Reflected Cross-Site Scripting in Creator Search
- **Severity:** Medium
- **Secure implementation:** HTML-encode all reflected values and add a restrictive Content-Security-Policy.
- **Regression test:** Repeat the original exploit (Place a script payload in the search query and observe it reflected unescaped in the results page.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

## Posts

### Missing Authorisation on Members-Only Posts (IDOR)
- **Severity:** High
- **Secure implementation:** Check an active membership (or authorship) server-side before serving members-only content.
- **Regression test:** Repeat the original exploit (Open a members-only post directly as a user with no membership for that page and read the full body.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

### Broken Object-Level Authorisation on Post Editing
- **Severity:** High
- **Secure implementation:** Enforce ownership checks on every post mutation.
- **Regression test:** Repeat the original exploit (Submit an edit for a post authored by someone else and observe the change is saved.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

### Stored Cross-Site Scripting in Post Body
- **Severity:** High
- **Secure implementation:** Sanitise post HTML with an allow-list sanitiser and encode on output.
- **Regression test:** Repeat the original exploit (Save a post containing a script payload and observe it stored and rendered unescaped.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

## Memberships & Payments

### Client-Side Price Tampering in Membership Checkout
- **Severity:** High
- **Secure implementation:** Ignore client-supplied prices; always charge the server-side tier price.
- **Regression test:** Repeat the original exploit (Subscribe while posting a price lower than the tier’s real price and observe the membership created at the fake price.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

### Negative Quantity Accepted in Subscription Checkout
- **Severity:** High
- **Secure implementation:** Validate months/quantities as positive integers server-side and reject negative totals.
- **Regression test:** Repeat the original exploit (Subscribe with a negative months value so the computed charge is negative and credits the wallet.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

### Insecure Direct Object Reference on Membership Records
- **Severity:** Medium
- **Secure implementation:** Scope membership lookups to the authenticated user (or admins).
- **Regression test:** Repeat the original exploit (View a membership record belonging to another user by changing the id.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

### Broken Object-Level Authorisation on Membership Cancellation
- **Severity:** High
- **Secure implementation:** Verify membership ownership before allowing cancellation.
- **Regression test:** Repeat the original exploit (Cancel a membership that belongs to another user.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

## Earnings & Payouts

### Insecure Direct Object Reference on Creator Earnings
- **Severity:** High
- **Secure implementation:** Restrict earnings views to the owning creator or finance admins.
- **Regression test:** Repeat the original exploit (Open the earnings page of a creator you are not, and read their figures.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

### Payout Amount Not Validated Against Earnings Balance
- **Severity:** Critical
- **Secure implementation:** Validate payout amounts against the server-side available balance and hold funds on request.
- **Regression test:** Repeat the original exploit (Request a payout greater than the creator’s available earnings and observe it accepted.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

### Missing CSRF Protection on Payout Requests
- **Severity:** High
- **Secure implementation:** Require per-session anti-CSRF tokens on payout and all state-changing endpoints.
- **Regression test:** Repeat the original exploit (Create a payout via a request carrying no origin marker, as a cross-site form would.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

## Supporters & Community

### Supporter Personal Data Exposed Without Authorisation
- **Severity:** High
- **Secure implementation:** Restrict supporter lists to the page owner and never expose supporter emails to other users.
- **Regression test:** Repeat the original exploit (Open another creator’s supporter list and read supporter names and email addresses.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

## Admin Panel

### Missing Role Check on Admin Panel (Broken Access Control)
- **Severity:** Critical
- **Secure implementation:** Enforce admin role server-side on all /admin routes and never render credential data.
- **Regression test:** Repeat the original exploit (Open the admin panel with a non-admin session and read the full user list.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

## Platform & API

### Exposed Debug Endpoint Discloses All User Credentials
- **Severity:** Critical
- **Secure implementation:** Remove debug endpoints from production builds and require admin auth for any diagnostics.
- **Regression test:** Repeat the original exploit (Fetch the debug endpoint and observe the full user dump including passwords.) and confirm it now fails safely, while the legitimate flow still works for authorised users.

### Predictable API Token Derived from Email Address
- **Severity:** High
- **Secure implementation:** Issue high-entropy random API tokens, store them hashed, and support revocation.
- **Regression test:** Repeat the original exploit (Call the API with a token computed from a victim’s email and receive their data without a session.) and confirm it now fails safely, while the legitimate flow still works for authorised users.
