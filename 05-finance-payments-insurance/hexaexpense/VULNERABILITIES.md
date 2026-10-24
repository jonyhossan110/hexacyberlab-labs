# HexaExpense — Vulnerability Map (LAB 50)

The complete map of every scored vulnerability in this lab, grouped by feature.
26 tests across 9 features. Each flaw is a real, working
vulnerability in the application and is detected server-side when the exploit succeeds.

## Login & Authentication

### SQL injection login bypass (legacy SSO route)
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **What it is:** String-built SQL queries let an attacker rewrite the login logic itself; parameterised queries remove the whole class.
- **Impact:** On a real expense platform this means an attacker logs in as the first account in the table — often an admin — with no password at all, reaching every claim, salary-adjacent bank detail and approval queue.
- **Report as:** "SQL Injection in Legacy Login Allows Authentication Bypass" (Critical) — Fix: Use parameterised queries everywhere and retire the legacy string-built login route.

### No rate limiting on login (brute force)
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **What it is:** Without throttling or lockout, password guessing is free and unlimited; detection here fires when the 10th failure is still processed.
- **Impact:** Attackers can grind through password lists against finance staff accounts until one works — expense systems hold bank details, so one cracked login is a payout-diversion kit.
- **Report as:** "Missing Rate Limiting on Login Enables Brute-Force Attacks" (High) — Fix: Add progressive delays, lockout and alerting after repeated failed logins per account and IP.

### User enumeration via login & password-reset responses
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **What it is:** Different error messages for "no such user" and "wrong password" hand attackers a verified target list for free.
- **Impact:** An attacker first confirms which employee emails are real, then aims phishing and password spraying only at accounts that exist — far quieter and far more effective.
- **Report as:** "Account Enumeration via Differential Authentication Responses" (Medium) — Fix: Return one generic message for all failed logins and reset requests regardless of account existence.

### Default demo credentials left active
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **What it is:** Vendor/demo accounts with guessable passwords survive into production unless someone explicitly removes them.
- **Impact:** Anyone on the internet can walk into a live employee account with a password printed in countless tutorials — no skill required, and the login looks legitimate in the logs.
- **Report as:** "Active Default Demo Account with Guessable Password" (High) — Fix: Remove seeded/demo accounts before go-live and force unique credentials for every user.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Intermediate
- **What it is:** Reset tokens must be unguessable random values; a token derived from the user id is an account-takeover formula.
- **Impact:** Whoever can compute the formula can reset the finance admin’s password and approve or redirect reimbursements — full control of the money-out workflow.
- **Report as:** "Predictable Password Reset Token Allows Account Takeover" (Critical) — Fix: Generate reset tokens from a CSPRNG (≥128 bits), store hashed, single-use, short expiry.

### Role stored in a client cookie (session/role tampering)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Authorization data kept on the client is attacker-controlled; roles must live server-side in the session.
- **Impact:** Any employee can promote themselves to finance or admin by editing a cookie — approving their own claims and exporting the whole company’s expense data.
- **Report as:** "Client-Side Role Cookie Trusted for Authorization" (Critical) — Fix: Store roles only in the server-side session and ignore client-supplied role values.

## Registration & Profile

### Mass assignment on registration (role self-assignment)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Binding request bodies directly to data models lets attackers set privileged fields the UI never offered.
- **Impact:** A stranger can register themselves directly as finance staff inside a target company and start approving claims and viewing bank details on day one.
- **Report as:** "Mass Assignment in Registration Allows Privilege Escalation" (High) — Fix: Whitelist bindable fields on registration; assign role and company server-side only.

### Stored XSS in display name
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **What it is:** User-controlled text must be output-encoded everywhere it renders, especially in back-office views.
- **Impact:** An employee plants a script that fires in the finance manager’s browser, riding their session to approve claims or change payout accounts.
- **Report as:** "Stored Cross-Site Scripting via Display Name" (High) — Fix: HTML-encode all user-supplied values on output and add a Content-Security-Policy.

### CSRF on profile update
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** State-changing forms need unforgeable tokens; cookies alone are sent automatically by the victim’s browser.
- **Impact:** A booby-trapped page an employee visits can silently rewrite their profile — including the bank account reimbursements are paid into.
- **Report as:** "Cross-Site Request Forgery on Profile Update" (Medium) — Fix: Require per-session CSRF tokens on all state-changing requests and validate Origin/Referer.

## Expense Claims

### Expense IDOR — read another company’s claim
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **What it is:** Every object access must verify the requester owns it or is authorised — sequential ids make guessing trivial.
- **Impact:** A competitor’s employee — or any user — reads the other company’s travel, client and spending details claim by claim, a direct confidentiality breach between tenants.
- **Report as:** "Insecure Direct Object Reference on Expense Claims (Cross-Tenant)" (High) — Fix: Enforce per-object ownership and tenant checks on every expense read.

### Amount tampering on a submitted claim
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Workflow locks enforced only in the UI are no lock at all; the server must enforce state rules.
- **Impact:** An employee submits a modest claim that passes review, then quietly inflates it before finance pays — the approved total and the paid total no longer match the reviewed one.
- **Report as:** "Submitted Expense Amount Editable via Direct Request (Business-Logic Tampering)" (High) — Fix: Reject amount changes once a claim leaves draft status; re-derive totals server-side.

### Receipt swap — attach someone else’s (bigger) receipt
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Linked objects need ownership checks too; a foreign key is just another IDOR waiting to happen.
- **Impact:** A $40 taxi claim suddenly carries a $640 hotel receipt as "proof", and approvers reviewing paperwork see matching evidence for money that was never spent by that employee.
- **Report as:** "Receipt Attachment Lacks Ownership Validation (Receipt Swap Fraud)" (High) — Fix: Verify receipt ownership and reconcile receipt amount against the claim before acceptance.

### Self-approval of own expense
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **What it is:** Segregation of duties must be enforced server-side: the requester can never be the approver.
- **Impact:** The four-eyes principle collapses — any employee can push their own invented claims through approval and into the payment queue, the classic internal expense-fraud path.
- **Report as:** "Expense Self-Approval Allowed (Missing Segregation of Duties)" (Critical) — Fix: Reject approvals where approver == claim owner; enforce approver role and reporting line.

### Skip the manager step — straight to paid
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Advanced
- **What it is:** State machines must verify the full transition history, not just the current status label.
- **Impact:** Colluding or compromised accounts can bypass the manager checkpoint entirely, so claims reach payment without the one review designed to catch invented expenses.
- **Report as:** "Approval Workflow Step Skippable — Payment Without Manager Approval" (Critical) — Fix: Require a recorded manager approval before the finance payment transition is accepted.

## Approvals & Workflow

### Manager approves another company’s claim
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Multi-tenant systems must scope every action to the actor’s tenant, not just their role.
- **Impact:** Tenant isolation fails at the workflow layer: one company’s manager can push through (or sabotage) a competitor tenant’s claims, corrupting both companies’ books.
- **Report as:** "Cross-Tenant Approval — Manager Can Approve Another Company’s Expenses" (High) — Fix: Scope approval rights to claims in the approver’s own company and reporting line.

### Manager approval-limit bypass ($500 policy)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Business limits written in policy documents must be encoded in the approval path, not just displayed.
- **Impact:** A manager can single-handedly approve purchases far above their authority, defeating the financial control the limit exists to provide.
- **Report as:** "Manager Approval Limit Not Enforced Server-Side" (Medium) — Fix: Enforce per-role approval ceilings server-side; route over-limit claims to finance.

## Reimbursements

### Reimbursement bank-account tampering (co-worker’s payout account)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Payout-detail changes are high-value operations: they need ownership checks, verification and audit alerts.
- **Impact:** An attacker reroutes a colleague’s — or the whole finance run’s — reimbursements to their own account; the books still balance, the money is simply gone.
- **Report as:** "Unauthorised Change of Employee Reimbursement Bank Details" (Critical) — Fix: Restrict bank changes to the account owner, require re-authentication and notify on change.

### Double reimbursement — pay the same claim twice
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Payment operations must be idempotent and state-guarded; a replayed request must not create a second payment.
- **Impact:** Whether by fraud or a double-click race, the company pays the same expense twice — at scale this is a steady, hard-to-notice bleed.
- **Report as:** "Duplicate Reimbursement Payments Possible (No Idempotency)" (High) — Fix: Allow exactly one payment per claim, guarded by status transition and a unique constraint.

## Budgets & Policies

### Monthly Meals budget cap ($400) not enforced
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Budget controls that only display warnings are decoration; enforcement belongs in the submit transaction.
- **Impact:** Departments silently blow their budgets claim by claim — finance only discovers the overrun at month-end, after the money has left.
- **Report as:** "Category Budget Cap Not Enforced on Expense Submission" (Medium) — Fix: Check cumulative category spend against the cap inside the submission transaction and block or escalate overruns.

## Search & Reports

### SQL injection in expense search leaks other tenants
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate
- **What it is:** Any place user input is glued into a query string is injectable — search boxes are the most common one.
- **Impact:** One crafted search dumps every tenant’s claims — amounts, employees, clients — a full cross-company data breach from a single text field.
- **Report as:** "SQL Injection in Expense Search Exposes Cross-Tenant Data" (Critical) — Fix: Parameterise the search query and always AND it with the requester’s tenant scope.

### Reflected XSS in expense search
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **What it is:** Reflected input must be encoded in the response, even on "harmless" internal tools.
- **Impact:** A crafted search link sent to a finance user executes script in their session — a stepping stone to approving claims or changing payout details as them.
- **Report as:** "Reflected Cross-Site Scripting in Expense Search" (Medium) — Fix: HTML-encode the reflected query term and all user data in search results.

### CSV export ignores tenant scope (all companies)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **What it is:** Exports and reports are data-access paths too; they need the same tenant filtering as the UI queries.
- **Impact:** Any employee can download the entire multi-tenant expense ledger — a reportable data breach covering every client company on the platform.
- **Report as:** "Expense CSV Export Missing Tenant Filter (Full Ledger Disclosure)" (High) — Fix: Apply tenant scoping to exports and restrict export rights to finance roles.

## Receipts & Files

### Unrestricted receipt upload — HTML served from the app origin
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Uploads must be type-validated and served safely; user files on the app origin inherit the app’s trust.
- **Impact:** Attackers host active content on the company’s own expense domain, turning every shared "receipt link" into a session-riding attack on staff.
- **Report as:** "Unrestricted File Upload — HTML/JS Served from Application Origin" (High) — Fix: Whitelist receipt file types, sniff content, and serve uploads with Content-Disposition: attachment from a separate host.

### Path traversal in receipt download reads server files
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Never build filesystem paths from raw user input; resolve and confine paths to the intended directory.
- **Impact:** Server configuration, credential files and payroll exports become downloadable by any user — the traversal turns a receipt viewer into a file-read primitive.
- **Report as:** "Path Traversal in File Download Exposes Server Files" (Critical) — Fix: Normalise and validate download paths against an allowlist directory; reject traversal sequences.

## Admin Panel

### Admin panel reachable by non-admin users
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **What it is:** Authentication is not authorization; every privileged route needs its own role check.
- **Impact:** The full staff directory of all tenant companies — names, roles, emails — is one URL away for any user, feeding targeted phishing and takeover attempts.
- **Report as:** "Admin Panel Accessible to Non-Admin Users" (High) — Fix: Enforce admin-role checks server-side on every /admin route.

### Debug endpoint dumps credentials & bank data (unauthenticated)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **What it is:** Debug/diagnostic endpoints must never ship to production, and never without authentication.
- **Impact:** The entire user table — passwords in plain text and bank IBANs — is public to the internet, a worst-case breach requiring zero skill to exploit.
- **Report as:** "Unauthenticated Debug Endpoint Exposes Passwords and Bank Details" (Critical) — Fix: Remove diagnostic endpoints from production builds; never store or return plaintext passwords.

