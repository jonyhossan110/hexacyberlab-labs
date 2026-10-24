# HexaSupport — Vulnerability Map (25 scored tests)

Every vulnerability below is a **scored test** in the lab's progress system. A test completes only when the server detects the exploit actually succeeding — there is no "mark done". Grouped by feature; counts match the in-app **🎯 Tests** page exactly.


## Login & Authentication — 6 test(s)

### SQL Injection Login Bypass
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **What it is:** String-built queries let an attacker rewrite the login logic itself. Parameterised queries and ORM bindings make the input data, never code.
- **Business impact:** On a real support portal this is a full account takeover of the first matching account — here the supervisor — exposing every customer conversation the company holds.
- **Report title:** SQL Injection in Login Form Allows Authentication Bypass
- **Fix:** Use parameterised queries everywhere; never concatenate user input into SQL; add a WAF/regression test for tautology payloads.

### Brute Force — No Rate Limiting or Lockout
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Without throttling, credential stuffing and password guessing are free. Rate limits, lockouts and MFA alerts are baseline auth controls.
- **Business impact:** Attackers can guess a customer or agent password at full speed; one reused password from a breach list is often all it takes to open a support account full of private conversations.
- **Report title:** No Rate Limiting or Account Lockout on Login
- **Fix:** Throttle per account and per IP, add progressive delays/lockout and alert on credential-stuffing patterns.

### User Enumeration via Login & Forgot-Password Responses
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** Distinct error messages turn login and reset forms into an account-existence oracle — the first step of targeted phishing and credential stuffing.
- **Business impact:** An attacker can harvest a verified list of the client's customers and staff emails, then aim password sprays and phishing precisely at them.
- **Report title:** Account Enumeration Through Differential Authentication Responses
- **Fix:** Return one generic message for all auth failures and reset requests regardless of account existence.

### Default Vendor Credentials Still Active
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Default and vendor accounts are the oldest free pass in security. They must be disabled or forced to change on first setup.
- **Business impact:** Anyone on the internet who knows the product manual walks into an agent account — reading and answering customer tickets as if they were staff.
- **Report title:** Default Support Account with Vendor Password Enabled
- **Fix:** Disable built-in accounts, force unique credentials at install, and audit for default passwords.

### Predictable Password-Reset Token
- **OWASP:** A07 Auth Failures · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** Reset tokens must be long, random and single-use. Anything derived from ids and timestamps is an invitation to take over accounts, starting with admins.
- **Business impact:** An attacker who can guess a reset token owns the supervisor account — and with it every ticket, every customer email and every internal note in the system.
- **Report title:** Password Reset Tokens Are Predictable (ID + Timestamp)
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly, bind them to one use.

### Session Cookie Role Tampering
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** Authorization data must live server-side (or be signed). Anything the client can edit — roles, prices, ids — will be edited.
- **Business impact:** A normal customer becomes supervisor by editing a cookie: full control of the helpdesk, its staff accounts and its SLA settings.
- **Report title:** Unsigned Session Cookie Allows Role Escalation to Supervisor
- **Fix:** Keep roles server-side in the session store, or sign session data (HMAC) and verify on every request.


## Registration & Profile — 3 test(s)

### Weak Password Policy (1-Character Passwords)
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** Password policy is a control, not a courtesy. Short passwords fall to brute force in seconds, especially beside the missing rate limits here.
- **Business impact:** Customers who pick "a" as a password hand attackers a trivially guessable account containing their support history and personal details.
- **Report title:** Registration Accepts Weak Passwords (No Minimum Policy)
- **Fix:** Enforce a minimum length (≥10) and screen against breached-password lists.

### Mass Assignment — Role Granted at Registration
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** Bind only whitelisted fields. Frameworks that auto-bind request data to models hand attackers every privileged column.
- **Business impact:** Anyone can self-register as supervisor of the client's helpdesk — no exploit tooling, just one extra form field.
- **Report title:** Mass Assignment Allows Privilege Escalation via Role Field
- **Fix:** Whitelist bindable fields per endpoint; never accept role/privilege fields from client input.

### Stored XSS in Display Name
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Stored XSS in profile fields is a staff-targeting weapon: the victim is whoever views the record — usually a privileged agent or admin.
- **Business impact:** A malicious customer can run script in an agent's browser, stealing their session and answering or deleting tickets as that agent.
- **Report title:** Stored Cross-Site Scripting via Display Name
- **Fix:** Context-encode all user-supplied output; sanitise stored rich text; deploy a restrictive CSP.


## Tickets — 6 test(s)

### Ticket IDOR — Reading Another Customer's Ticket
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Every object access needs an ownership/authorization check. Sequential ids plus a missing check is the classic IDOR that leaks whole support histories.
- **Business impact:** Customers can read each other's support tickets — billing problems, addresses, audit requests — a direct privacy breach and a GDPR problem for the client.
- **Report title:** Insecure Direct Object Reference on Ticket View
- **Fix:** Authorize every object access server-side against the session user and role; use unguessable ids as defence in depth.

### Internal Agent Notes Leaked to Customers
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Internal commentary is among the most sensitive data in a helpdesk — candid remarks about customers, fraud flags, legal exposure. Views must filter by audience, not by hope.
- **Business impact:** Customers reading internal notes see exactly what staff say about them — expired cards, retention flags, suspicion notes — destroying trust and sometimes creating legal liability.
- **Report title:** Internal Notes Exposed in Customer Ticket View
- **Fix:** Filter internal-only content server-side per audience; never rely on hiding it in the UI.

### Reply Role Spoofing — Customer Posts as an Agent
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Display attributes like author role must come from the authenticated session, never from request parameters.
- **Business impact:** A customer can post "official" agent replies — fake refund approvals, fake policy statements — inside real support threads, and other readers will trust them.
- **Report title:** Reply Author Role Taken from Client Input (Impersonation)
- **Fix:** Derive author identity and role exclusively from the server-side session.

### Ticket Status Tampering by Customer
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Medium
- **What it is:** Workflow state transitions are authorization decisions. Accepting them from any role breaks SLAs, metrics and audit trails.
- **Business impact:** Customers can close or reopen tickets at will — hiding unresolved issues, corrupting support metrics and voiding SLA reporting.
- **Report title:** Customers Can Change Ticket Status via Reply Parameter
- **Fix:** Enforce role-based state transitions server-side; ignore workflow fields from unauthorised roles.

### Priority & SLA Tampering by Customer
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Medium
- **What it is:** Priority drives staffing, SLA clocks and escalation. If customers set it freely, the entire triage system is fiction.
- **Business impact:** Every customer marks themselves Critical: real emergencies drown, SLA reports become meaningless, and support costs climb.
- **Report title:** Customers Can Set Ticket Priority and Reset SLA Deadlines
- **Fix:** Restrict priority changes to staff roles; recompute SLA only on authorised transitions and log changes.

### Agent Acting Outside Their Queue (Reassign/Close)
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Medium
- **What it is:** Queue ownership is an authorization boundary inside the app, not a UI convention. Staff-scope checks belong on every action.
- **Business impact:** A rogue or careless agent can close another agent's critical tickets, sabotage colleagues' metrics, or bury a VIP case — with the audit trail pointing at the workflow, not the person.
- **Report title:** Agents Can Reassign and Close Tickets Outside Their Queue
- **Fix:** Check queue ownership on assign/close actions; reserve cross-queue actions for supervisors and log them.


## Search & Canned Responses — 3 test(s)

### SQL Injection in Ticket Search
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Search is an injection surface like any other. A bypassed filter turns scoped search into a full data dump.
- **Business impact:** A customer can dump the entire ticket base through the search box — every subject line of every customer's support history.
- **Report title:** SQL Injection in Ticket Search Bypasses Result Scoping
- **Fix:** Parameterise search queries; enforce result scoping in the data layer, not by filter strings.

### Reflected XSS in Search
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** Reflected output must be encoded for its context. Search pages are classic XSS carriers because the input is echoed by design.
- **Business impact:** A crafted search link sent to an agent executes script in their session — a stepping stone to helpdesk takeover.
- **Report title:** Reflected Cross-Site Scripting in Ticket Search
- **Fix:** HTML-encode reflected input; validate search terms; add CSP.

### Canned Response Tampering (Editing the Supervisor's Templates)
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Medium
- **What it is:** Shared content still has owners. Editing rights are an authorization decision, especially for templates that speak for the company.
- **Business impact:** An agent can rewrite the official refund policy template — and every customer thereafter gets the tampered wording from "support".
- **Report title:** Missing Ownership Check on Canned Response Editing
- **Fix:** Authorize canned-response edits by owner or supervisor role; audit template changes.


## Attachments — 2 test(s)

### Unrestricted File Upload — HTML Served Back
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Uploads must be validated, renamed, and served from a separate origin with safe content types — otherwise the app hosts attacker pages.
- **Business impact:** Attackers host phishing pages and script under the client's real support domain, inheriting its trust — and any agent who opens the attachment is in range.
- **Report title:** Unrestricted Attachment Upload Allows Stored HTML/JS Hosting
- **Fix:** Whitelist file types, verify content, store outside web root, serve with Content-Disposition and safe types.

### Path Traversal in File Download
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Never build filesystem paths from raw input. Canonicalise, confine to the intended directory, and serve by id instead of by name.
- **Business impact:** Source code, configuration and any file the server can read leak through a download link — usually the first step to a deeper compromise.
- **Report title:** Path Traversal in Attachment Download Exposes Server Files
- **Fix:** Resolve and verify the canonical path stays inside the upload directory; map downloads to stored ids.


## Admin Panel — 2 test(s)

### Supervisor Panel Open to Any Logged-In User
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **What it is:** Authentication is not authorization. Sensitive routes need explicit role checks on the server for every request.
- **Business impact:** Every registered customer can open the supervisor panel and read all staff and customer credentials in plaintext.
- **Report title:** Missing Role Check on Supervisor Administration Panel
- **Fix:** Enforce supervisor role server-side on all admin routes; deny by default.

### CSRF on Supervisor SLA Settings
- **OWASP:** A01 Broken Access Control · **Difficulty:** Advanced · **Severity (in a real client report):** Medium
- **What it is:** State-changing forms need anti-CSRF tokens that are actually verified, plus SameSite cookies as defence in depth.
- **Business impact:** A supervisor who visits a malicious page can silently rewrite the company's SLA commitments — a business-integrity attack, not just a technical one.
- **Report title:** Cross-Site Request Forgery on SLA Configuration
- **Fix:** Issue and verify per-session CSRF tokens on all state-changing requests; set SameSite=Lax on session cookies.


## API & Platform — 3 test(s)

### Weak API Token (Base64 of Email)
- **OWASP:** A07 Auth Failures · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** API credentials must be random secrets. Deriving them from public identifiers (emails, ids) gives every attacker a master key formula.
- **Business impact:** Anyone who knows a customer's email — printed on every ticket — can pull their full ticket history through the API.
- **Report title:** API Keys Are Predictable (Base64-Encoded Email Addresses)
- **Fix:** Issue random, high-entropy API keys; store hashed; allow revocation and rotation.

### Unauthenticated Customer Data Exposure Endpoint
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **What it is:** Debug and internal endpoints ship to production constantly. If it responds, it is public — authenticate and minimise everything.
- **Business impact:** The entire customer and staff credential list is one anonymous request away — instant full compromise of the helpdesk.
- **Report title:** Unauthenticated Endpoint Exposes All Users and Passwords
- **Fix:** Require authentication and authorization on every API route; never return password material.

### Missing Security Headers
- **OWASP:** A05 Misconfiguration · **Difficulty:** Beginner · **Severity (in a real client report):** Low
- **What it is:** Security headers are cheap, layered defence: CSP blunts XSS, frame-ancestors stops clickjacking, nosniff stops type confusion.
- **Business impact:** The support portal can be embedded in an attacker's page for clickjacking, tricking staff into clicking disguised actions.
- **Report title:** Missing HTTP Security Headers (CSP, Frame Protection, Nosniff)
- **Fix:** Add Content-Security-Policy, X-Frame-Options/frame-ancestors, X-Content-Type-Options and Referrer-Policy.
