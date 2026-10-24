# HexaLegal — Fix & Retest Guide (LAB 97)

For every test: the report entry, the secure implementation, and the regression retest that proves the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- **Severity:** Critical
- **Remediation:** Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.
- **Secure implementation:** Parameterise the login query, validate input types, and return a generic error for every failed login.
- **Regression retest:** Re-run the original exploit (Submit an email containing a SQL fragment with a comment terminator and any password; a session is created without knowing a real password.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

### No Rate Limiting or Account Lockout on Login Endpoint
- **Severity:** High
- **Remediation:** Add progressive rate limiting, lockout or CAPTCHA after repeated failures, and alert on credential-stuffing patterns.
- **Secure implementation:** Enforce per-account and per-IP throttling, temporary lockout after repeated failures, and monitoring/alerting.
- **Regression retest:** Re-run the original exploit (Submit at least 10 failed logins for one account; the application keeps accepting attempts with no throttle, delay, or lockout.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

### Account Enumeration Through Divergent Authentication Responses
- **Severity:** Medium
- **Remediation:** Return one identical, generic message for every failed login and password-reset request regardless of account existence.
- **Secure implementation:** Use a single generic response and consistent timing for all authentication failures and reset requests.
- **Regression retest:** Re-run the original exploit (Probe 5 or more distinct emails; responses differ depending on whether the account exists, confirming valid usernames.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

### Working Demo Credentials Published on the Login Page
- **Severity:** High
- **Remediation:** Remove demo/default accounts from production, never publish credentials, and force unique passwords at first setup.
- **Secure implementation:** Delete demo accounts before go-live, scan for default credentials, and never print credentials in the UI.
- **Regression retest:** Re-run the original exploit (The login page prints a demo email and password; signing in with them succeeds.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

### Password Reset Tokens Are Predictable and Not Tied to a Request
- **Severity:** Critical
- **Remediation:** Generate reset tokens with a CSPRNG (at least 128 bits), store only a hash, expire them quickly, and accept a token only if it was actually issued.
- **Secure implementation:** Use random, single-use, short-lived tokens stored hashed server-side and bound to an actual reset request.
- **Regression retest:** Re-run the original exploit (Compute the token from the target's user id using the visible formula and submit it without any reset ever being requested; the password changes.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

### Authorization Based on a Client-Controlled Role Cookie
- **Severity:** High
- **Remediation:** Derive roles only from the server-side session record; never trust role or privilege data supplied by the client.
- **Secure implementation:** Store the role in the server-side session and ignore any client-supplied role values.
- **Regression retest:** Re-run the original exploit (Log in as a client, change the hx_role cookie to attorney, and load the attorney console; access is granted from the cookie alone.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

## Registration & Profile

### No Password Strength Policy on Registration
- **Severity:** Medium
- **Remediation:** Enforce a minimum length (12+ recommended), check against breached-password lists, and allow passphrases.
- **Secure implementation:** Server-side password policy: minimum length, breached-password screening, and no silent acceptance of trivial passwords.
- **Regression retest:** Re-run the original exploit (Create an account with a password shorter than 4 characters; registration succeeds.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

### Mass Assignment in Registration Allows Privilege Escalation
- **Severity:** Critical
- **Remediation:** Whitelist the exact fields a request may set (name, email, password) and assign roles only through server-side logic.
- **Secure implementation:** Explicitly whitelist bindable fields per endpoint; ignore everything else and assign roles server-side.
- **Regression retest:** Re-run the original exploit (Include an extra role field in the registration body; the new account is created with the attacker-chosen privileged role.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

### Stored Cross-Site Scripting via Display Name
- **Severity:** High
- **Remediation:** Contextually escape all user-controlled output and apply a strict Content-Security-Policy as defence in depth.
- **Secure implementation:** Escape output by context everywhere user data is rendered; validate input and add a CSP header.
- **Regression retest:** Re-run the original exploit (Store a script payload in the display name; it is served unescaped to other users.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

### Missing CSRF Protection on Profile Update
- **Severity:** Medium
- **Remediation:** Require a per-session anti-CSRF token on every state-changing request and verify Origin/Referer as defence in depth.
- **Secure implementation:** Issue a per-session token, embed it in forms, and reject state changes that lack a valid token.
- **Regression retest:** Re-run the original exploit (Submit a profile change without the session's hx_origin marker; the change is accepted, proving no CSRF verification exists.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

## Search & Discovery

### SQL Injection in Search Exposes Unpublished Draft Matters
- **Severity:** High
- **Remediation:** Parameterise all queries and enforce visibility rules (status, ownership) inside the query itself, not in the UI.
- **Secure implementation:** Use prepared statements and add server-side row-level filters for draft/published status and ownership.
- **Regression retest:** Re-run the original exploit (Inject a tautology into the search term; the results include the draft matter that normal lists hide.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

### Reflected Cross-Site Scripting in Search
- **Severity:** Medium
- **Remediation:** Escape all reflected values for their output context and deploy a Content-Security-Policy.
- **Secure implementation:** Contextual output encoding for every reflected value.
- **Regression retest:** Re-run the original exploit (Put an HTML/JS payload in the q parameter; it is reflected unescaped in the results page.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

## Cases & Matters

### Insecure Direct Object Reference on Case Records
- **Severity:** Critical
- **Remediation:** Enforce per-object authorization on every request: the session user must own, be assigned to, or administer the requested case.
- **Secure implementation:** Add an ownership/assignment check to every case read and write; return 404 for objects the user may not see.
- **Regression retest:** Re-run the original exploit (Request a case that belongs to a different client; the full matter is served with no ownership check.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

### Confidential Attorney Notes Exposed Without Authorization
- **Severity:** High
- **Remediation:** Restrict notes endpoints to the assigned attorney and firm admins, and audit access to work-product records.
- **Secure implementation:** Check assignment/role on the notes endpoint specifically, not just on the case page.
- **Regression retest:** Re-run the original exploit (Request the notes of a case you are not assigned to; the confidential notes are served.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

### Missing Authorization on Case Update Allows Tampering
- **Severity:** High
- **Remediation:** Apply the same ownership/assignment authorization to all mutating case endpoints and log changes.
- **Secure implementation:** Authorize every mutation against the target object and keep an audit trail of edits.
- **Regression retest:** Re-run the original exploit (Submit an edit for a case owned by another client; the change is saved.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

## Documents & Files

### Insecure Direct Object Reference on Case Documents
- **Severity:** Critical
- **Remediation:** Authorize document access through the parent case (owner, assigned attorney, or admin) on every file request.
- **Secure implementation:** Resolve document → case → authorized users on every request; deny by default.
- **Regression retest:** Re-run the original exploit (Request a document belonging to another client's case; the file content is served.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

### Directory Traversal in Download Endpoint
- **Severity:** High
- **Remediation:** Resolve the requested path, verify it stays inside the allowed directory, and serve files by id rather than by user-supplied path.
- **Secure implementation:** Canonicalise paths, enforce an allow-list directory prefix, and reject any traversal sequences.
- **Regression retest:** Re-run the original exploit (Supply ../ sequences in the file parameter; a file outside the documents folder is returned.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

### Unrestricted File Upload Allows Stored HTML/JS Execution
- **Severity:** High
- **Remediation:** Allow-list safe file types, store uploads outside the web root, serve them with Content-Disposition: attachment and a safe content type.
- **Secure implementation:** Validate types by content, rename uploads, serve with attachment disposition and nosniff, and isolate upload storage.
- **Regression retest:** Re-run the original exploit (Upload an .html file containing a script payload; it is stored and later served as text/html from the application origin.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

## Appointments

### Insecure Direct Object Reference on Appointments
- **Severity:** High
- **Remediation:** Check that the session user is a party to the appointment (client, assigned attorney, or admin) before serving it.
- **Secure implementation:** Per-object authorization on appointment reads and writes.
- **Regression retest:** Re-run the original exploit (Request an appointment belonging to another client; its details are served.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

### Missing Availability Check Allows Double-Booking
- **Severity:** Medium
- **Remediation:** Enforce a uniqueness/availability check on (attorney, slot) inside a transaction when creating appointments.
- **Secure implementation:** Validate slot availability server-side at booking time with a uniqueness constraint.
- **Regression retest:** Re-run the original exploit (Create an appointment for an attorney at a slot that is already booked; the system accepts both bookings.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

## Billing & Invoices

### Insecure Direct Object Reference on Invoices
- **Severity:** High
- **Remediation:** Authorize invoice access to the billed client, the case's assigned attorney, and firm admins only.
- **Secure implementation:** Per-object authorization on all billing reads and payment actions.
- **Regression retest:** Re-run the original exploit (Request an invoice issued to another client; the full bill is served.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

### Payment Endpoint Trusts Client-Supplied Amount
- **Severity:** Critical
- **Remediation:** Compute the payable amount from the server-side invoice, verify the payment against it, and only then mark the invoice paid.
- **Secure implementation:** Ignore client-supplied amounts for settlement decisions; reconcile against the stored invoice total.
- **Regression retest:** Re-run the original exploit (Submit a payment far below the invoice total; the invoice is marked paid in full.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

## Admin Panel

### Broken Access Control on Admin Console
- **Severity:** Critical
- **Remediation:** Require the admin role (from the server-side session) for every admin route and deny by default.
- **Secure implementation:** Role-check middleware on all admin routes using server-side session data.
- **Regression retest:** Re-run the original exploit (Load the admin console with a non-admin session; the user table including passwords is rendered.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

### Missing CSRF Protection on Admin Actions
- **Severity:** High
- **Remediation:** Require valid per-session CSRF tokens on all admin state-changing endpoints and re-check the admin role server-side.
- **Secure implementation:** CSRF tokens on every state-changing route, verified server-side.
- **Regression retest:** Re-run the original exploit (Submit the deactivation without the session's hx_origin marker; the account is deactivated.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

## Platform & API

### API Authentication Token Is a Predictable Encoding of the User Email
- **Severity:** High
- **Remediation:** Issue high-entropy random API tokens, store them hashed, scope them per user, and support revocation.
- **Secure implementation:** Random, hashed, revocable API credentials with per-token scopes and audit logging.
- **Regression retest:** Re-run the original exploit (Base64-encode a victim's email and present it as the API token; their cases are returned without any session.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.

### Unauthenticated Debug Endpoint Exposes All User Records
- **Severity:** Critical
- **Remediation:** Remove debug endpoints from production builds; if diagnostics are required, gate them behind admin authentication and network restrictions.
- **Secure implementation:** Delete debug endpoints before release and add a release checklist item that fails the build if they exist.
- **Regression retest:** Re-run the original exploit (Fetch the debug endpoint with no credentials; the full user table including passwords is returned.) against the fixed build. It must fail: no test flip, no unauthorized data, no state change. Then confirm the legitimate flow still works for an authorized user.
