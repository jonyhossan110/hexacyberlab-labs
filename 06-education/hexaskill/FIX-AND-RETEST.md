# HexaSkill (LAB 58) — Fix & Retest

For every test in the registry: the finding as written in a real report, the secure implementation,
and the regression test that proves the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- **Severity:** Critical
- **Secure implementation:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Regression test:** Re-run the original exploit (SQL injection login bypass): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

### Missing Rate Limiting on Login Allows Unlimited Password Guessing
- **Severity:** High
- **Secure implementation:** Add progressive delays, per-account and per-IP throttling, lockout and alerting on repeated failures.
- **Regression test:** Re-run the original exploit (Brute force — no rate limit or lockout): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

### Login and Password-Reset Responses Reveal Whether an Account Exists
- **Severity:** Medium
- **Secure implementation:** Return one generic message ("invalid credentials" / "if an account exists…") for every failure case.
- **Regression test:** Re-run the original exploit (User enumeration via differing error messages): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

### Publicly Documented Demo Account With Default Password Left Active
- **Severity:** High
- **Secure implementation:** Remove demo accounts from production or force unique credentials and automatic expiry.
- **Regression test:** Re-run the original exploit (Published demo account with default credentials): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

### Password Reset Tokens Are Predictable From the User ID
- **Severity:** High
- **Secure implementation:** Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly and invalidate after use.
- **Regression test:** Re-run the original exploit (Predictable password-reset token): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

### Role Stored in a Client-Controlled Cookie Enables Privilege Escalation
- **Severity:** Critical
- **Secure implementation:** Keep roles in the server-side session/record only; ignore any role claims arriving from the client.
- **Regression test:** Re-run the original exploit (Session role cookie trusted by the server): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

## Registration & Profile

### Registration Accepts Trivially Weak Passwords
- **Severity:** Medium
- **Secure implementation:** Enforce a minimum length (≥10) and block common/breached passwords at registration and password change.
- **Regression test:** Re-run the original exploit (Weak password policy on registration): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

### Mass Assignment in Registration Allows Self-Assignment of Privileged Roles
- **Severity:** High
- **Secure implementation:** Whitelist exactly the fields each endpoint may set; assign roles only through privileged server-side flows.
- **Regression test:** Re-run the original exploit (Mass assignment — role set at registration): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

### Stored Cross-Site Scripting via Display Name
- **Severity:** High
- **Secure implementation:** Context-encode all user data on output and add a Content-Security-Policy as defence in depth.
- **Regression test:** Re-run the original exploit (Stored XSS in display name): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

### Missing CSRF Protection on Profile Update
- **Severity:** Medium
- **Secure implementation:** Require per-session CSRF tokens on all state-changing forms and verify Origin/Referer as backup.
- **Regression test:** Re-run the original exploit (CSRF on profile update): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

## Skill Paths

### Module Completion Endpoint Does Not Enforce Path Order
- **Severity:** Medium
- **Secure implementation:** On completion, verify all prerequisite modules are complete for that learner on the server before recording progress.
- **Regression test:** Re-run the original exploit (Path order not enforced — final module first): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

### Insecure Direct Object Reference Exposes Other Learners Progress
- **Severity:** Medium
- **Secure implementation:** Authorise each record access against the session user (or a legitimate assessor/team-lead relationship).
- **Regression test:** Re-run the original exploit (IDOR — any learner progress record readable): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

### Missing Entitlement Check Serves Premium Course Content to Free Accounts
- **Severity:** High
- **Secure implementation:** Check the account entitlement server-side before serving any premium module content.
- **Regression test:** Re-run the original exploit (Premium path content served without entitlement): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

## Assessments

### Server Trusts Client-Supplied Assessment Score
- **Severity:** High
- **Secure implementation:** Ignore any score in the request; compute results only from server-held answers.
- **Regression test:** Re-run the original exploit (Assessment score trusted from the client): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

### Grade-Modification Endpoint Missing Role Authorisation
- **Severity:** High
- **Secure implementation:** Require an assessor/admin role server-side on grading endpoints and log every grade change.
- **Regression test:** Re-run the original exploit (Learner can change grades via the assessor endpoint): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

### API Endpoint Discloses Assessment Answer Keys to Learners
- **Severity:** High
- **Secure implementation:** Remove answer data from learner-facing APIs; serve answers only to authorised assessor tooling after submission closes.
- **Regression test:** Re-run the original exploit (Assessment answer key exposed via API): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

## Badges

### Badge Award Endpoint Does Not Verify Path Completion
- **Severity:** High
- **Secure implementation:** Issue badges only from the completion flow after server-side verification of all module progress.
- **Regression test:** Re-run the original exploit (Badge self-award without completing the path): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

### Badge Verification Page Renders Attacker-Controlled Holder Name
- **Severity:** High
- **Secure implementation:** Render the holder name exclusively from the badge record; ignore name parameters in the request.
- **Regression test:** Re-run the original exploit (Badge verification page trusts a client-supplied name): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

### Missing Ownership Check Allows Deleting Other Users Badges
- **Severity:** Medium
- **Secure implementation:** Authorise deletion to the badge owner or an admin, and keep an audit log of destructive actions.
- **Regression test:** Re-run the original exploit (Any user can delete another user badge): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

## Portfolios

### Private Portfolios Served Without an Ownership Check
- **Severity:** Medium
- **Secure implementation:** Enforce the private flag server-side: owner, assessors and team leads only.
- **Regression test:** Re-run the original exploit (Private portfolio readable by IDOR): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

### Unrestricted File Upload Allows Hosting HTML/Script Content on the Application Origin
- **Severity:** High
- **Secure implementation:** Allowlist safe file types, store uploads outside the web root, serve with safe Content-Type and Content-Disposition.
- **Regression test:** Re-run the original exploit (Unrestricted upload — HTML file served from the app origin): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

## Teams

### Team Member Role Not Enforced on Member-Removal Action
- **Severity:** Medium
- **Secure implementation:** Require the team-lead role server-side for management actions within a team.
- **Regression test:** Re-run the original exploit (Plain team member performs team-lead actions): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

### Cross-Tenant Access to Other Companies Team Progress Reports
- **Severity:** High
- **Secure implementation:** Scope every team query to teams the requester belongs to (or administers), server-side.
- **Regression test:** Re-run the original exploit (Other company team report readable (IDOR)): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

## Admin Panel

### Administrative Data Export Accessible to Non-Admin Users
- **Severity:** High
- **Secure implementation:** Enforce admin role checks inside the export endpoint and audit all data exports.
- **Regression test:** Re-run the original exploit (Admin learner export open to any signed-in user): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

## Platform & API

### Unauthenticated Debug Endpoint Exposes All User Credentials
- **Severity:** Critical
- **Secure implementation:** Remove debug endpoints from production builds and scan deployments for diagnostic routes.
- **Regression test:** Re-run the original exploit (Debug endpoint dumps all accounts and passwords): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.

### Predictable API Tokens Derived From User Email Addresses
- **Severity:** High
- **Secure implementation:** Issue random, revocable API tokens server-side and store them hashed.
- **Regression test:** Re-run the original exploit (API token is a predictable function of the email): it must now fail — no bypass, no forged state, no leaked data — while the legitimate flow keeps working.
