# HexaInsurance (LAB 47) — Fix & Retest

For every scored test: the report entry, the secure implementation, and how
to retest. A fix is only verified when the original exploit fails AND the
legitimate workflow still works.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- **Severity:** Critical
- **Vulnerability:** Submit the login form with an injection payload such as ' OR '1'='1 in the email field and any password; the bent query returns the first user (the platform admin) and a session is issued.
- **Secure implementation:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Remediation:** Replace string-built queries with parameterised queries and add centralised input handling.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

### No Rate Limiting or Lockout on Login Endpoint
- **Severity:** High
- **Vulnerability:** Send 10+ failed login attempts for one account (e.g. bob@test.local) in a row; every attempt is processed normally — no delay, CAPTCHA, or lockout ever appears.
- **Secure implementation:** Add progressive delays, per-account and per-IP rate limits, lockout/back-off, and alerting on repeated failures.
- **Remediation:** Throttle login attempts per account and IP, add lockout/back-off and breach-password screening.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

### Account Enumeration via Differential Login Error Messages
- **Severity:** Medium
- **Vulnerability:** Submit a wrong password for an existing email ("Incorrect password.") and for a non-existent email ("No account found for that email.") — the distinguishable responses confirm valid accounts.
- **Secure implementation:** Return one generic "invalid email or password" message for every failed login.
- **Remediation:** Use a single generic authentication failure message and consistent response timing.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

### Active Demo Account with Published Default Credentials
- **Severity:** High
- **Vulnerability:** Use the demo credentials printed on the login page (demo@hexainsure.local / demo123) to sign in to a live account.
- **Secure implementation:** Remove demo/default accounts from production, or force a unique password at first login and disable them when unused.
- **Remediation:** Disable demo accounts in production and enforce unique, rotated credentials for any seeded account.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

### Password Reset Token Predictable from Email Address
- **Severity:** High
- **Vulnerability:** Compute md5(victim email), take the first 10 hex characters, and submit it as the reset token with a new password — the portal accepts it and changes the password.
- **Secure implementation:** Generate reset tokens from a CSPRNG (≥128 bits), store only a hash, expire them quickly, and make them single-use.
- **Remediation:** Issue cryptographically random, short-lived, single-use reset tokens.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

### Privilege Escalation via Unsigned Role Cookie
- **Severity:** Critical
- **Vulnerability:** Sign in as a customer, edit the hx_role cookie to "admin", and open /admin — the console trusts the cookie instead of the server-side account role.
- **Secure implementation:** Keep roles server-side in the session record; never trust client-supplied role claims (or sign and verify them).
- **Remediation:** Derive authorization from server-side session data only; ignore client-supplied role values.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

## Registration & Profile

### No Minimum Password Requirements at Registration
- **Severity:** Medium
- **Vulnerability:** Register a new account with a 1-character password; the account is created without any policy complaint.
- **Secure implementation:** Enforce a minimum length (≥10–12) and screen new passwords against known-breached lists.
- **Remediation:** Enforce password length/complexity policy and breached-password screening at registration and reset.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

### Mass Assignment at Registration Allows Self-Assigned Agent Role
- **Severity:** High
- **Vulnerability:** Submit the registration form with an extra role=agent field; the server binds it and creates a working agent account.
- **Secure implementation:** Whitelist the fields a request may set (name, email, password); assign roles only through privileged server-side flows.
- **Remediation:** Apply explicit field allow-lists on all model binding; never bind role/privilege fields from client input.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

### Stored Cross-Site Scripting via Display Name
- **Severity:** High
- **Vulnerability:** Create an account whose display name contains a script payload; the payload is stored and rendered unescaped wherever the name appears (header greeting, agent queue, admin list).
- **Secure implementation:** Context-encode all user-controlled output and add a Content-Security-Policy as defence in depth.
- **Remediation:** Encode user-controlled data on output in every context and deploy a restrictive CSP.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

### Missing CSRF Verification on Profile Update
- **Severity:** Medium
- **Vulnerability:** POST a profile change with the hidden marker field missing (or a cross-site Origin); the server applies the change without verifying the marker.
- **Secure implementation:** Verify a per-session anti-CSRF token on every state-changing request and check Origin/Referer as a second layer.
- **Remediation:** Validate anti-CSRF tokens server-side on all state-changing endpoints.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

## Policies & Coverage

### Insecure Direct Object Reference on Policy Details
- **Severity:** High
- **Vulnerability:** As Alice, request /policies/3 (Bob's Home Shield Plus policy); the full policy is served with no ownership check.
- **Secure implementation:** Authorise every object access against the session user (owner, assigned agent, or admin) on the server.
- **Remediation:** Enforce per-object ownership checks on all policy endpoints.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

### Mass Assignment Allows Coverage Limit and Premium Tampering
- **Severity:** Critical
- **Vulnerability:** Submit the policy update with a tampered coverageLimit (or premium); the server binds and stores the attacker-chosen values.
- **Secure implementation:** Allow-list editable fields; compute coverage and premium changes only through priced, server-side workflows.
- **Remediation:** Bind only benign fields from requests; derive financial terms from server-side rating logic.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

### SQL Injection in Policy Search Leaks All Policies
- **Severity:** Critical
- **Vulnerability:** Search with the payload ' OR '1'='1; the bent query returns every customer's policies instead of only your own matches.
- **Secure implementation:** Parameterise search queries and scope results to the requester's own records by default.
- **Remediation:** Use parameterised queries and enforce result scoping by account.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

### Reflected Cross-Site Scripting in Policy Search
- **Severity:** Medium
- **Vulnerability:** Search for a script payload; the results page reflects it unescaped in the "Results for" line, executing in the viewer's browser.
- **Secure implementation:** HTML-encode all reflected values; treat search terms as data, never markup.
- **Remediation:** Encode reflected user input on output and add a CSP.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

## Claims

### Insecure Direct Object Reference on Claim Details
- **Severity:** High
- **Vulnerability:** As Alice, request /claims/2 (Bob's claim); the full claim detail is served without an ownership check.
- **Secure implementation:** Check claim ownership (or assigned-agent/admin role) on every claim read and write.
- **Remediation:** Enforce per-object authorization on all claim endpoints.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

### Missing Server-Side Validation of Claim Amount Against Coverage
- **Severity:** High
- **Vulnerability:** File a claim on your own Auto Protect policy (coverage $20,000) for $50,000; the server stores it without ever checking the coverage limit.
- **Secure implementation:** Validate claim amounts server-side against the policy's coverage limit and flag over-limit submissions for fraud review.
- **Remediation:** Enforce coverage-limit checks on claim creation and route exceptions to fraud review.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

### Unrestricted File Upload Allows Stored HTML/Script Execution
- **Severity:** High
- **Vulnerability:** Upload an evidence file with an .html name and a script payload; opening its download link serves it as text/html, executing under the portal origin.
- **Secure implementation:** Allow-list safe evidence types, store uploads outside the web root, serve with Content-Disposition: attachment and a safe content type.
- **Remediation:** Restrict upload types, serve downloads as attachments with safe content types, and scan stored files.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

### Insecure Direct Object Reference on Evidence Downloads
- **Severity:** High
- **Vulnerability:** As Alice, request /evidence/2; Bob's claim evidence is downloaded with no ownership check.
- **Secure implementation:** Authorise downloads against the parent claim's ownership before serving any file.
- **Remediation:** Enforce ownership checks on file download endpoints.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

## Renewals & Billing

### Client-Side Price Tampering on Policy Renewal
- **Severity:** Critical
- **Vulnerability:** Submit the renewal for your own policy with the premium field tampered from $340 to $1; the policy renews at the attacker-chosen price.
- **Secure implementation:** Ignore client-supplied prices; recompute premiums server-side from the rating engine at transaction time.
- **Remediation:** Compute all prices server-side; never accept monetary values from the client.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

### Missing Authorization on Policy Renewal Action
- **Severity:** High
- **Vulnerability:** As Alice, submit a renewal for Bob's policy (id 3); the state change is applied to another customer's policy.
- **Secure implementation:** Authorise every state-changing action against the target object's owner.
- **Remediation:** Enforce ownership checks on all policy actions, not just views.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

## Agent Portal

### Broken Access Control Exposes Agent Claims Queue to Customers
- **Severity:** High
- **Vulnerability:** Open /agent while signed in as a plain customer; the agent claims queue renders with all customers' claims and personal details.
- **Secure implementation:** Enforce role checks (agent/admin) server-side on every back-office route.
- **Remediation:** Add server-side role authorization to all staff routes.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

### Missing Authorization on Claim Decision Endpoint Allows Self-Approval
- **Severity:** Critical
- **Vulnerability:** As a customer, POST decision=approved for your own under-review claim; the claim status changes with no agent involved.
- **Secure implementation:** Verify agent/admin role inside the decision handler and log all claim decisions with the acting user.
- **Remediation:** Enforce role checks in the decision handler and maintain an audit trail of claim decisions.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

## Admin Panel

### State-Changing Admin Action Performed via GET Without CSRF Protection
- **Severity:** High
- **Vulnerability:** Trigger the deactivation URL as the admin (a bare GET, no token); the target account is disabled immediately.
- **Secure implementation:** Require POST with a verified anti-CSRF token for all admin actions; never mutate state on GET.
- **Remediation:** Convert admin actions to token-protected POSTs and audit all state changes.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

## Platform & API

### Unauthenticated API Endpoint Exposes All Policyholder Data
- **Severity:** Critical
- **Vulnerability:** Request /api/policyholders with no session at all; the JSON response lists every user with contact details and their policies.
- **Secure implementation:** Require authenticated, authorised API access with scoped tokens; return only the minimum fields a partner needs.
- **Remediation:** Put all API endpoints behind authentication and per-client authorization scopes.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

### Missing Baseline Security Headers
- **Severity:** Low
- **Vulnerability:** Load any portal page and inspect the response headers: no CSP, X-Frame-Options, or X-Content-Type-Options is set anywhere.
- **Secure implementation:** Set a baseline header set (CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy) at the server or proxy.
- **Remediation:** Deploy a standard security header set across all responses.
- **Retest:** Repeat the original exploit steps — it must now fail (access denied, generic error, or validated input); then run the matching legitimate workflow end-to-end and confirm it still succeeds.

