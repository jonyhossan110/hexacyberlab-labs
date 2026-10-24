# HexaAgency — Vulnerability Map (LAB 96)

Every scored test in this lab, grouped by feature. 26 tests across 8 features.

## Login & Authentication

### SQL injection login bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: the Login & Authentication flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: Use email: ' OR '1'='1' -- with any password — you are logged in as the first account (the admin).
- Impact: On a real agency platform this hands an attacker the admin account in seconds — every client, contract and invoice behind it is exposed.

### Brute force — no rate limit or lockout
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: the Login & Authentication flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: After 10 failed attempts for one account the app still processes attempt 11 exactly the same — that missing throttle is the flaw.
- Impact: A client-facing portal with no throttling lets attackers grind through password lists against staff accounts until one opens.

### User enumeration via differing responses
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: the Login & Authentication flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: Probe 5+ different emails — the app says "account exists" in one path and "no such account" in the other, building you a valid user list.
- Impact: Attackers harvest the valid staff/client email list first, then aim phishing and password attacks only at accounts that exist.

### Demo / default credentials accepted
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: the Login & Authentication flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: Log in with the demo credentials printed on the login page (demo@hexaagency.local / demo1234).
- Impact: A forgotten demo login on a real agency portal is a standing invitation into live client work.

### Predictable password-reset token
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Location: the Login & Authentication flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: Tokens are HA<userId>-<userId*137+42>. Compute another user's token (e.g. the admin, id 1) and reset their password without any email.
- Impact: Predictable reset tokens mean instant takeover of the agency admin account and every client relationship behind it.

### Role cookie tampering (hx_role)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: the Login & Authentication flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: Set the hx_role cookie to "admin" in your browser, then visit /admin — the gate opens on your word alone.
- Impact: Any low-privilege client login becomes an admin by editing a cookie — full control of the agency's clients, contracts and team.

## Registration & Profile

### Weak password policy (1 character)
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: the Registration & Profile flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: Create an account with the password "x" — it is accepted, and that account can be brute-forced instantly.
- Impact: Weak-password accounts on a client portal are the soft underbelly attackers probe first.

### Mass assignment — role via registration
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: the Registration & Profile flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: Submit the registration form with an extra field role=admin — your new account is created as an administrator.
- Impact: Self-registration straight into an admin account means total compromise of the agency platform from the public sign-up page.

### Stored XSS in display name
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: the Registration & Profile flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: Register (or rename yourself) with a name like <script>alert(1)</script> — it is stored and rendered raw to other users.
- Impact: A poisoned display name fires in the admin's browser, enabling session theft and actions taken as the agency admin.

### CSRF on profile update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: the Registration & Profile flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: Submit a profile change with no hx_origin marker (e.g. via curl) — the change is accepted, proving no CSRF defence exists.
- Impact: An attacker page could silently rewrite a staff member's profile — or their email — while they browse the web logged in.

## Search

### SQL injection in global search
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- Location: the Search flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: Search for ' OR '1'='1 — the results dump every client and project, including ones outside your access.
- Impact: One search box can dump the agency's entire client list and project pipeline to any logged-in user.

### Reflected XSS in search
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: the Search flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: Search for <script>alert(1)</script> — the payload is reflected raw into the page.
- Impact: A crafted search link sent to an agency admin runs script in their session when clicked.

## Clients & Client Portal

### Client record IDOR (cross-client data leak)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: the Clients & Client Portal flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: Visit /clients/2 while logged in as client 1 — you see the other client's record, including confidential notes.
- Impact: Every client of the agency can read every other client's confidential commercial notes by changing a number in the URL.

### Editing another client's internal notes
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: the Clients & Client Portal flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: As client 1, POST a notes change for clientId 2 — the other client's internal notes are overwritten.
- Impact: A malicious client could vandalise or falsify the agency's internal notes about competitors — data-integrity damage, not just leakage.

### Full client directory exposed to client accounts
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: the Clients & Client Portal flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: Log in as any client and open /clients — the entire client directory is listed.
- Impact: The agency's whole client roster — a trade secret in itself — is visible to any single client login.

## Projects

### Project IDOR (other clients' projects)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: the Projects flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: As Acme's user, open /projects/3 — Globex's launch project, with its budget, is served to you.
- Impact: Competitors who are also agency clients can read each other's project scopes and budgets — a serious commercial leak.

### Budget tampering via project update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: the Projects flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: POST a status update for your project with an extra budget field set to 1 — the stored budget changes.
- Impact: A client could rewrite a project budget to $1 and dispute every later invoice on that basis.

### Internal project visible to clients
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: the Projects flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: Open /projects/4 as a client — the internal pitch project is served even though it is hidden from your list.
- Impact: Internal pitch and strategy work leaking to a client can burn deals and expose the agency's playbook.

## Contracts & Invoices

### Contract IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: the Contracts & Invoices flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: As client 1 open /contracts/2 — the other client's agreement and its value are fully readable.
- Impact: Clients reading each other's signed agreement values destroys negotiating confidentiality across the whole roster.

### Invoice IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: the Contracts & Invoices flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: As client 1 open /invoices/2 — another client's $5,000 invoice is displayed.
- Impact: Invoice leakage reveals what every other client pays — pricing intelligence competitors would pay for.

### Invoice amount tampering at payment
- OWASP: A04:2021 Insecure Design
- Difficulty: Intermediate
- Location: the Contracts & Invoices flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: Pay invoice INV-1001 but submit amount=1 — the $2,400 invoice is marked PAID IN FULL for $1.
- Impact: Any client can settle any invoice for $1 — direct, immediate revenue loss for the agency.

### Marking your own invoice paid (status endpoint)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: the Contracts & Invoices flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: POST to /invoices/<id>/status with status=paid as a client — your unpaid invoice becomes PAID without any payment.
- Impact: Clients can zero their own bills with a single request, no payment involved at all.

## Deliverables & Files

### Deliverable download IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: the Deliverables & Files flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: As client 1, download deliverable 2 — the other client's launch plan file is served to you.
- Impact: Finished client work — brand guidelines, launch plans — can be stolen by any other client with a login.

### Path traversal on file download
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: the Deliverables & Files flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: Request /download?file=../server.js — the application's own source code is returned.
- Impact: Source code disclosure exposes every other flaw in the app and can cascade into full server compromise.

## Admin Panel

### Admin panel open to any logged-in user
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: the Admin Panel flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: Log in as an ordinary staff or client account and open /admin/users — the full user table with password hashes is listed.
- Impact: The entire staff credential list exposed to any login is one step from full platform takeover.

### CSRF on admin user deactivation
- OWASP: A01:2021 Broken Access Control
- Difficulty: Advanced
- Location: the Admin Panel flows of the HexaAgency app (see PRACTICE-GUIDE.md for the challenge).
- Exploitation outline: POST /admin/users/<id>/deactivate with no hx_origin marker — the user is deactivated anyway.
- Impact: An attacker could deactivate the agency's staff accounts through a booby-trapped link the admin clicks.
