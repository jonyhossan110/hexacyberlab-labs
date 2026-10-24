# HexaInvoice — Vulnerability Map (26 scored tests)

Every vulnerability below is a **scored test** in the lab's progress system. A test completes only when the server detects the exploit actually succeeding — there is no "mark done". Grouped by feature; counts match the in-app **🎯 Tests** page exactly.

## Login & Authentication — 6 test(s)

### SQL Injection Login Bypass
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **What it is:** String-built queries let attacker input change the meaning of the query itself; the first matching row (often a privileged account) is returned without any password check.
- **Business impact:** On a real invoicing platform this means an attacker logs in as the firm owner with no password at all — every client invoice, bank detail and payment record is exposed in one request.
- **Report title:** SQL Injection in Authentication (Login Bypass)
- **Fix:** Use parameterised queries / prepared statements everywhere; never build queries by string concatenation.

### Brute Force — No Rate Limiting
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Without throttling or lockout, an online password-guessing attack is limited only by the attacker's patience.
- **Business impact:** A real firm account with a human-chosen password falls to a dictionary attack overnight; the attacker then issues fake invoices in the firm's name.
- **Report title:** Missing Brute-Force Protection on Login
- **Fix:** Rate-limit and progressively delay failed logins, lock or challenge accounts after repeated failures, and alert on anomalies.

### User Enumeration via Password Reset
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** Authentication endpoints must answer identically whether or not an account exists; otherwise attackers harvest valid usernames for targeted attacks.
- **Business impact:** Attackers confirm which finance staff have accounts, then focus phishing and password spraying exactly on them.
- **Report title:** User Enumeration via Divergent Password-Reset Responses
- **Fix:** Return one generic message for all reset requests ("If the account exists, a reset email has been sent").

### Weak / Default Credentials
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **What it is:** Default and weak credentials bypass every other control; shipped passwords must be forced to change on first use.
- **Business impact:** A default admin password on a billing platform is a standing invitation: anyone can walk in, read all tenants' data and deactivate real users.
- **Report title:** Default Credentials on Platform Admin Account
- **Fix:** Force password change on first login, block known-default passwords, and audit seeded accounts before go-live.

### Predictable Password-Reset Token
- **OWASP:** A07 Authentication Failures · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Reset tokens must be long, random and single-use; a token derived from a public identifier is an account-takeover formula.
- **Business impact:** Anyone who can guess a user ID can reset that user's password — including the firm owner — and lock the real business out of its own billing.
- **Report title:** Predictable Password Reset Tokens Allow Account Takeover
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, and invalidate after use.

### Session Cookie Role Tampering
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Authorization data must live server-side (or be cryptographically signed); anything stored client-side is a suggestion the user can rewrite.
- **Business impact:** A client who was meant to see only their own invoices promotes themselves to firm owner — full access to every client, invoice and payout setting.
- **Report title:** Unsigned Client-Side Session Allows Role Tampering (Privilege Escalation)
- **Fix:** Keep session state server-side or sign session tokens (e.g. HMAC/JWT with a server secret) and re-check the role from the database per request.

## Registration & Firm Profile — 4 test(s)

### Mass Assignment — Role via Registration
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Bind only an explicit allowlist of fields on signup and profile updates; frameworks that bind everything let users set privileged attributes.
- **Business impact:** Self-service registration becomes instant admin: an attacker creates a platform-admin account from the public signup page.
- **Report title:** Mass Assignment in Registration Allows Privilege Escalation
- **Fix:** Allowlist bindable fields server-side (name, email, password); assign roles and plans only through privileged code paths.

### Weak Password Policy
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** A password policy is a security control, not a UX nicety: without a floor, users pick passwords that fall to the first guessing attempt.
- **Business impact:** Clients and staff end up with one-character passwords on a system holding financial records — credential stuffing becomes trivial.
- **Report title:** No Minimum Password Strength Enforced
- **Fix:** Enforce ≥10–12 characters, screen against breached-password lists, and apply the same policy to resets and changes.

### Stored XSS in Firm Name
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Every user-controlled string must be output-encoded at render time; stored XSS turns one profile field into script execution for every viewer.
- **Business impact:** The payload fires in the browser of every staff member and client who views an invoice — session theft and fake payment-detail changes follow.
- **Report title:** Stored Cross-Site Scripting via Firm Name
- **Fix:** Context-aware output encoding for all user data; add a Content-Security-Policy as defence in depth.

### CSRF on Firm Profile Update
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** State-changing endpoints need anti-CSRF tokens (or strict same-site checks); cookies alone will ride along on a forged cross-site request.
- **Business impact:** A malicious page visited by the owner silently rewrites the firm's bank/payment details — future client payments are diverted to the attacker.
- **Report title:** Cross-Site Request Forgery on Profile Update
- **Fix:** Require a per-session anti-CSRF token on all state-changing requests and verify Origin/Referer as a fallback.

## Clients — 2 test(s)

### Cross-Account Client IDOR
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Every object access must verify the caller owns (or is authorised for) that object — a valid login is not authorisation.
- **Business impact:** Competing firms can read each other's client lists — names, contacts and billing addresses — straight from the URL bar.
- **Report title:** Insecure Direct Object Reference on Client Records
- **Fix:** Scope every query by the caller's account/tenant and return 404 for objects outside it.

### Stored XSS in Client Contact Name
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Data entered in one place surfaces in many others; without encoding, every display of that field is an injection point.
- **Business impact:** An attacker plants a script in a client record that fires in the accountant's browser — the trusted person with full billing access.
- **Report title:** Stored Cross-Site Scripting via Client Contact Name
- **Fix:** Output-encode all stored user data at render; validate/sanitise rich fields server-side.

## Invoices — 4 test(s)

### Cross-Account Invoice IDOR
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Financial documents need per-object authorisation: sequential IDs plus missing checks equal bulk data theft.
- **Business impact:** A competitor reads your invoices line by line — pricing, clients, payment status — and undercuts or impersonates you.
- **Report title:** Insecure Direct Object Reference on Invoice Detail
- **Fix:** Authorise every invoice access against the session's tenant; use unguessable IDs as defence in depth, not as the control.

### Line-Item Price Tampering
- **OWASP:** A04 Insecure Design · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Prices and rates must be looked up server-side from the catalogue; any client-supplied money value is attacker-controlled.
- **Business impact:** Invoices are issued for $1 instead of $300 — whether by a malicious insider or a tampered integration, the firm bills a fraction of what it earned.
- **Report title:** Client-Side Price Tampering on Invoice Creation
- **Fix:** Ignore client-posted prices; always price line items from the server-side catalogue and recompute totals server-side.

### Tax Rate & Discount Manipulation
- **OWASP:** A04 Insecure Design · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Business rules (fixed tax rates, discount ceilings) must be enforced server-side; a rule that lives only in the UI does not exist.
- **Business impact:** Invoices go out with 100% "discounts" or zero tax — direct revenue loss for the firm and false tax filings for its clients.
- **Report title:** Server-Side Validation Missing for Tax Rate and Discount
- **Fix:** Fix tax rates server-side per jurisdiction and enforce discount ceilings with approval workflows for exceptions.

### Forged Payment Status (Draft → Paid)
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** State transitions are business logic: "paid" must be reachable only through a verified payment, never by naming it.
- **Business impact:** Unpaid invoices are marked paid — the firm writes off real receivables, and clients are told they owe nothing.
- **Report title:** Invoice Status Forgery — Unauthorised State Transition to Paid
- **Fix:** Implement a server-side state machine; allow the paid state only when recorded payments cover the invoice total.

## Payments — 2 test(s)

### Forged Payment Settlement Amount
- **OWASP:** A04 Insecure Design · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** Settlement must be computed from recorded payment rows on the server, never from a client-supplied summary field.
- **Business impact:** A client "pays" $1 and receives a fully-paid invoice and receipt — the firm's books show settled while the money never arrived.
- **Report title:** Payment Settlement Based on Client-Supplied Amount (Payment Forgery)
- **Fix:** Compute paid status strictly from the sum of verified payment records; reconcile against the payment provider.

### Payment Receipt IDOR
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** Downloads and documents are objects too: receipts, PDFs and exports need the same authorisation as pages.
- **Business impact:** Receipts confirm bank methods, amounts and dates of another firm's transactions — prime material for invoice fraud and BEC scams.
- **Report title:** Insecure Direct Object Reference on Payment Receipts
- **Fix:** Check receipt ownership against the session tenant before serving any document.

## Recurring Templates — 2 test(s)

### Cross-Account Recurring Template Abuse
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Actions on scheduled/automation objects need the same ownership checks as reads; automation multiplies the damage of one missed check.
- **Business impact:** Attackers trigger invoices from another firm's templates — corrupting their billing and spamming their clients automatically.
- **Report title:** Missing Authorisation on Recurring Template Actions
- **Fix:** Scope template read/write/generate operations to the owning tenant and audit cross-tenant attempts.

### Generated Invoice Amount Tampering
- **OWASP:** A04 Insecure Design · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Derived documents must inherit values from the source object server-side; overrides belong in explicit, authorised edit flows.
- **Business impact:** Retainers silently bill at $1 a month — the firm's most reliable revenue stream is discounted to zero by one edited field.
- **Report title:** Client-Supplied Amount Override on Template Generation
- **Fix:** Generate invoices strictly from stored template values; ignore or strictly validate any posted overrides.

## Search & Exports — 3 test(s)

### SQL Injection in Invoice Search
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** Search is a query too: every filter built by concatenation is injectable, and injection in a multi-tenant search breaks tenant isolation.
- **Business impact:** One search string dumps every firm's invoices from a feature meant to show only your own.
- **Report title:** SQL Injection in Invoice Search
- **Fix:** Parameterise search queries and apply tenant scoping in the data layer, not in string filters.

### Reflected XSS in Search
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** Reflecting request input into HTML without encoding is XSS, even on an internal search page.
- **Business impact:** A crafted search link sent to a staff member executes script in their session — the entry point for account takeover.
- **Report title:** Reflected Cross-Site Scripting in Search Results
- **Fix:** Encode all reflected input on output; avoid injecting raw query text into HTML.

### Full Data Export Exposure
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** Bulk exports are the highest-value endpoint in a SaaS: they need the strictest role checks and tenant scoping.
- **Business impact:** One click exfiltrates the entire billing database — every firm, every client, every amount — the exact dataset needed for large-scale invoice fraud.
- **Report title:** Broken Access Control on Data Export (All Tenants)
- **Fix:** Restrict exports to owner role, scope rows to the caller's tenant, and log/alert on export events.

## Admin Panel — 2 test(s)

### Admin User List Exposure (JSON)
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** APIs and helper endpoints inherit none of the page's protection automatically; each route needs its own authorisation.
- **Business impact:** Every user's email and password is handed to any low-privilege account — full platform compromise in one request.
- **Report title:** Broken Access Control Exposes Full User List with Passwords via JSON Endpoint
- **Fix:** Enforce admin role on the endpoint; never serialise password fields; store passwords hashed (bcrypt/argon2).

### CSRF on Admin User Deactivation
- **OWASP:** A01 Broken Access Control · **Difficulty:** Advanced · **Severity (in a real client report):** High
- **What it is:** Privileged state changes need anti-CSRF tokens most of all; a single forged request can lock a firm out of its own platform.
- **Business impact:** An attacker page visited by the admin deactivates the firm's staff — denial of service against the business, timed for maximum damage.
- **Report title:** Cross-Site Request Forgery on Admin User Deactivation
- **Fix:** Require anti-CSRF tokens on all admin mutations and re-confirm highly sensitive actions.

## Platform & API — 1 test(s)

### Predictable API Token & Unscoped API Data
- **OWASP:** A07 Authentication Failures · **Difficulty:** Advanced · **Severity (in a real client report):** Critical
- **What it is:** API credentials must be high-entropy random values, and every API response must be scoped to the authenticated tenant.
- **Business impact:** Anyone who knows a business email (public information) owns its API — and this API hands over every tenant's invoices, not just theirs.
- **Report title:** Predictable API Tokens and Missing Tenant Scoping in API
- **Fix:** Issue random, revocable API keys (hashed at rest), and enforce tenant scoping on every API query.
