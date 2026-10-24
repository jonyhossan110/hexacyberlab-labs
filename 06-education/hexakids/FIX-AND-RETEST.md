# HexaKids — Fix & Retest Guide (LAB 57)

For every scored test: the secure implementation that closes the hole, and the regression check that proves the exploit no longer works. Apply the fix in a COPY of the lab, then re-run the exploit — the test must NOT flip, and the legitimate flow must keep working.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- **Fix:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Retest:** Repeat the original exploit (Submit an injection payload (e.g. ' OR '1'='1) as the email on the legacy string-built login query.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

### No Rate Limiting or Account Lockout on Login (High)
- **Fix:** Add progressive delays, lockout and alerting after repeated failures; require MFA for sensitive roles.
- **Retest:** Repeat the original exploit (Send 10+ failed logins for one account; the app keeps accepting attempts with no throttle, delay or lockout.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

### User Enumeration via Differential Forgot-Password Responses (Medium)
- **Fix:** Return one generic response regardless of whether the account exists.
- **Retest:** Repeat the original exploit (Request a reset for an email that exists and for one that does not — the responses differ, confirming which emails hold accounts.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

### Active Demo Account with Published Credentials (High)
- **Fix:** Remove or disable demo/seed accounts in production and rotate any shared credentials.
- **Retest:** Repeat the original exploit (Log in with the demo account printed in the README (demo@hexakids.local / demo123).) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

### Password-Reset Tokens Are Predictable (Derived from User ID) (Critical)
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and make them single-use.
- **Retest:** Repeat the original exploit (The reset token is derived only from the user id (HK<id>-<checksum>); compute any user's token and reset their password without ever requesting one.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

### Privilege Escalation via Client-Controlled Role Cookie (Critical)
- **Fix:** Store role server-side in the session; never trust client-supplied role claims.
- **Retest:** Repeat the original exploit (The server trusts the client-supplied hx_role cookie; set it to admin and open /admin with a parent session.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

## Registration & Profile

### No Minimum Password Strength Enforced at Registration (Medium)
- **Fix:** Enforce a minimum length (≥10) and block known-breached passwords.
- **Retest:** Repeat the original exploit (Register a new account with a 1-character password — it is accepted.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

### Mass Assignment in Registration Allows Role/Plan Escalation (High)
- **Fix:** Whitelist bindable fields per endpoint; assign role and plan server-side only.
- **Retest:** Repeat the original exploit (Add role=teacher (or plan=premium) to the registration POST; the server binds the whole body onto the new account.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

### Stored Cross-Site Scripting via Display Name (High)
- **Fix:** Contextually escape all user-supplied output and validate input on write.
- **Retest:** Repeat the original exploit (Register or update your profile with an HTML/JS payload as the display name; it is stored and rendered raw on the dashboard.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

### Missing CSRF Protection on Profile Update (Medium)
- **Fix:** Require per-session CSRF tokens on all state-changing requests and verify Origin/Referer.
- **Retest:** Repeat the original exploit (Submit a profile change with a cross-site Origin (as a malicious site would from a logged-in victim's browser); no token is checked and the change is applied.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

## Children & Reports

### Insecure Direct Object Reference on Child Profiles (High)
- **Fix:** Verify the requesting user owns (or is authorised for) the child record on every access.
- **Retest:** Repeat the original exploit (As one parent, open another family's child profile by changing the id (e.g. /children/201).) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

### Insecure Direct Object Reference on Progress Reports (High)
- **Fix:** Enforce per-object authorisation on report endpoints, not just profile pages.
- **Retest:** Repeat the original exploit (Open the progress report of a child from another family by id.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

### Unauthorised Stars Awarding via API (No Role, Ownership or Cap Checks) (High)
- **Fix:** Server-side enforce role, class membership and a per-award cap on the award endpoint.
- **Retest:** Repeat the original exploit (The award endpoint is meant for teachers giving ≤10 stars to their own class; call it as a parent for any child with any amount.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

## Activities & Rewards

### Premium Content Accessible Without Subscription (Client-Side Paywall Only) (High)
- **Fix:** Check the account's plan server-side before serving or completing premium activities.
- **Retest:** Repeat the original exploit (As a free-plan parent, complete a premium activity directly; the paywall is only visual.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

### Assessment Answer Keys Exposed to Clients (Medium)
- **Fix:** Grade submissions server-side; never return answer keys to clients.
- **Retest:** Repeat the original exploit (Fetch the answer key for any activity; the API returns it to any logged-in user.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

### Missing Balance Check Allows Reward Redemption with Insufficient Stars (High)
- **Fix:** Verify sufficient balance server-side and reject redemptions that would overdraw.
- **Retest:** Repeat the original exploit (Redeem a reward costing more stars than the child has; the balance is never checked and goes negative.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

## Classes & Teachers

### Teachers Can Access Children Outside Their Assigned Classes (High)
- **Fix:** Scope teacher access to children enrolled in their own classes.
- **Retest:** Repeat the original exploit (As a teacher, open the profile of a child who is not in any of your classes.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

### Class Enrolment Without Invite Code or Teacher Approval (High)
- **Fix:** Require a valid invite code and teacher confirmation for class membership changes.
- **Retest:** Repeat the original exploit (Add a child to a teacher's class with a direct POST; the invite code and teacher approval are never checked.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

### Class Roster with Parent Emails Exposed to Any Authenticated User (High)
- **Fix:** Restrict roster access to the class teacher/admin and minimise returned fields.
- **Retest:** Repeat the original exploit (Fetch a class roster as an unrelated parent; it lists every child plus their parent's email.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

## Subscriptions & Billing

### Client-Supplied Price Trusted for Subscription Charges (High)
- **Fix:** Determine prices server-side from the plan id only; ignore client-sent amounts.
- **Retest:** Repeat the original exploit (Subscribe to Premium sending price=0 from the client; the server charges what the client claims.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

### Insecure Direct Object Reference on Billing Invoices (Medium)
- **Fix:** Check invoice ownership on every read and use non-sequential identifiers.
- **Retest:** Repeat the original exploit (Open another family's billing invoice by changing the invoice id.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

## Search

### SQL Injection in Search Returns All Records (High)
- **Fix:** Parameterise search queries and enforce family scoping in the data layer.
- **Retest:** Repeat the original exploit (Search with an injection payload; the string-built query returns children from every family, not just yours.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

### Reflected Cross-Site Scripting in Search Results (Medium)
- **Fix:** HTML-encode reflected user input in all templates.
- **Retest:** Repeat the original exploit (The search term is echoed into the results page unescaped; a script payload in q is reflected raw.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

## Admin Panel

### Missing CSRF Protection on Administrative User Deactivation (High)
- **Fix:** Require CSRF tokens and Origin verification on all admin state-changing actions.
- **Retest:** Repeat the original exploit (Trigger the admin deactivation action with a cross-site Origin and no token; the account is deactivated.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

## Platform & API

### API Tokens Are Predictable (Base64-Encoded Email) (High)
- **Fix:** Issue high-entropy random API tokens, store hashes, and support revocation.
- **Retest:** Repeat the original exploit (API tokens are just hk_ + base64(email); forge any user's token from their public email address.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.

### Unauthenticated Debug Endpoint Exposes All User Credentials (Critical)
- **Fix:** Remove debug endpoints from production or gate them behind admin auth and network restrictions.
- **Retest:** Repeat the original exploit (Fetch the leftover debug endpoint with no login at all; it returns every user including plaintext passwords.) — it must fail (no session/object/effect obtained). Then repeat the equivalent legitimate action as an authorised user — it must still succeed.
