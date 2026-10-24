# HexaAgency — Practice Guide (LAB 96)

Challenges grouped by feature, then difficulty. Each challenge mirrors the Mission Board at /tests.

## Login & Authentication

### [Beginner] SQL injection login bypass
- Objective: make the "SQL injection login bypass" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: The login form builds its account lookup by gluing your input straight into a query string.
- Hint 2: Try a classic tautology in the email field, e.g. something with ' OR '1'='1 in it.
- Hint 3: Use email: ' OR '1'='1' -- with any password — you are logged in as the first account (the admin).

### [Beginner] Brute force — no rate limit or lockout
- Objective: make the "Brute force — no rate limit or lockout" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: Keep guessing the same account's password — does anything ever slow you down or lock the account?
- Hint 2: Script 10+ wrong passwords for one account and watch the responses stay identical.
- Hint 3: After 10 failed attempts for one account the app still processes attempt 11 exactly the same — that missing throttle is the flaw.

### [Beginner] User enumeration via differing responses
- Objective: make the "User enumeration via differing responses" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: Compare the login error for an email that exists with one that does not.
- Hint 2: Also compare the forgot-password message for real vs fake emails.
- Hint 3: Probe 5+ different emails — the app says "account exists" in one path and "no such account" in the other, building you a valid user list.

### [Beginner] Demo / default credentials accepted
- Objective: make the "Demo / default credentials accepted" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: The login page itself hints at a demo account — read it carefully.
- Hint 2: Demo accounts shipped for sales demos almost never get removed.
- Hint 3: Log in with the demo credentials printed on the login page (demo@hexaagency.local / demo1234).

### [Intermediate] Predictable password-reset token
- Objective: make the "Predictable password-reset token" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: Request a reset for your own account and study the token format in the URL you are given.
- Hint 2: The token looks structured — part of it clearly relates to the account.
- Hint 3: Tokens are HA<userId>-<userId*137+42>. Compute another user's token (e.g. the admin, id 1) and reset their password without any email.

### [Intermediate] Role cookie tampering (hx_role)
- Objective: make the "Role cookie tampering (hx_role)" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: After logging in, inspect your cookies — one of them mirrors your role.
- Hint 2: The server trusts that cookie for the admin area instead of its own session record.
- Hint 3: Set the hx_role cookie to "admin" in your browser, then visit /admin — the gate opens on your word alone.

## Registration & Profile

### [Beginner] Weak password policy (1 character)
- Objective: make the "Weak password policy (1 character)" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: Register a new account and shrink the password down — how short can it go?
- Hint 2: The form never checks length or complexity.
- Hint 3: Create an account with the password "x" — it is accepted, and that account can be brute-forced instantly.

### [Beginner] Stored XSS in display name
- Objective: make the "Stored XSS in display name" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: Your display name is rendered on team and admin pages exactly as typed.
- Hint 2: Names are not encoded on output anywhere in the app.
- Hint 3: Register (or rename yourself) with a name like <script>alert(1)</script> — it is stored and rendered raw to other users.

### [Intermediate] Mass assignment — role via registration
- Objective: make the "Mass assignment — role via registration" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: The registration handler binds every submitted field onto the new user object.
- Hint 2: What fields does a user record have that the form never shows? Think role.
- Hint 3: Submit the registration form with an extra field role=admin — your new account is created as an administrator.

### [Intermediate] CSRF on profile update
- Objective: make the "CSRF on profile update" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: The profile form posts without any anti-CSRF token; the app only checks a same-site marker it sets itself.
- Hint 2: A cross-site form post will not carry that marker cookie's form field.
- Hint 3: Submit a profile change with no hx_origin marker (e.g. via curl) — the change is accepted, proving no CSRF defence exists.

## Search

### [Beginner] Reflected XSS in search
- Objective: make the "Reflected XSS in search" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: Your search term is echoed back in the results heading.
- Hint 2: It is echoed without any encoding.
- Hint 3: Search for <script>alert(1)</script> — the payload is reflected raw into the page.

### [Intermediate] SQL injection in global search
- Objective: make the "SQL injection in global search" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: Search builds its WHERE clause by string concatenation, just like login.
- Hint 2: A tautology in the query makes the filter match every row in the table.
- Hint 3: Search for ' OR '1'='1 — the results dump every client and project, including ones outside your access.

## Clients & Client Portal

### [Beginner] Client record IDOR (cross-client data leak)
- Objective: make the "Client record IDOR (cross-client data leak)" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: Log in as a client (alice@acme.local) and open your client record from the portal.
- Hint 2: The URL carries a sequential id, and the server never checks that it is yours.
- Hint 3: Visit /clients/2 while logged in as client 1 — you see the other client's record, including confidential notes.

### [Beginner] Full client directory exposed to client accounts
- Objective: make the "Full client directory exposed to client accounts" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: The /clients index was built for staff — but who actually gets blocked?
- Hint 2: Client accounts are authenticated, and that is the only check the page makes.
- Hint 3: Log in as any client and open /clients — the entire client directory is listed.

### [Intermediate] Editing another client's internal notes
- Objective: make the "Editing another client's internal notes" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: The client-notes update endpoint trusts the id in the form body.
- Hint 2: It never compares the record's owner with your session.
- Hint 3: As client 1, POST a notes change for clientId 2 — the other client's internal notes are overwritten.

## Projects

### [Beginner] Project IDOR (other clients' projects)
- Objective: make the "Project IDOR (other clients' projects)" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: Project pages follow the same sequential-id pattern as client records.
- Hint 2: Open one of your projects, then change the id.
- Hint 3: As Acme's user, open /projects/3 — Globex's launch project, with its budget, is served to you.

### [Intermediate] Budget tampering via project update
- Objective: make the "Budget tampering via project update" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: The project update endpoint accepts the fields it is given — including money fields.
- Hint 2: The form shows status only, but the handler binds more than the form shows.
- Hint 3: POST a status update for your project with an extra budget field set to 1 — the stored budget changes.

### [Intermediate] Internal project visible to clients
- Objective: make the "Internal project visible to clients" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: One seeded project is marked internal — it should never appear for client accounts.
- Hint 2: Direct URLs bypass the listing filters entirely.
- Hint 3: Open /projects/4 as a client — the internal pitch project is served even though it is hidden from your list.

## Contracts & Invoices

### [Beginner] Contract IDOR
- Objective: make the "Contract IDOR" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: Contracts use sequential ids and the same missing ownership check.
- Hint 2: Find your own contract, then increment the id.
- Hint 3: As client 1 open /contracts/2 — the other client's agreement and its value are fully readable.

### [Beginner] Invoice IDOR
- Objective: make the "Invoice IDOR" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: Invoices follow the same pattern: sequential ids, login-only check.
- Hint 2: Open your invoice, then change the id in the URL.
- Hint 3: As client 1 open /invoices/2 — another client's $5,000 invoice is displayed.

### [Intermediate] Invoice amount tampering at payment
- Objective: make the "Invoice amount tampering at payment" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: The pay form submits the amount back to the server — and the server believes it.
- Hint 2: The stored invoice amount is never compared with what you submit.
- Hint 3: Pay invoice INV-1001 but submit amount=1 — the $2,400 invoice is marked PAID IN FULL for $1.

### [Intermediate] Marking your own invoice paid (status endpoint)
- Objective: make the "Marking your own invoice paid (status endpoint)" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: There is a staff endpoint that flips invoice status — look at what authorisation it performs.
- Hint 2: It checks that you are logged in. Nothing more.
- Hint 3: POST to /invoices/<id>/status with status=paid as a client — your unpaid invoice becomes PAID without any payment.

## Deliverables & Files

### [Beginner] Deliverable download IDOR
- Objective: make the "Deliverable download IDOR" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: Deliverable downloads are keyed by sequential id like everything else here.
- Hint 2: Download your own deliverable, then change the id.
- Hint 3: As client 1, download deliverable 2 — the other client's launch plan file is served to you.

### [Intermediate] Path traversal on file download
- Objective: make the "Path traversal on file download" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: The /download endpoint joins the file parameter straight onto the files directory.
- Hint 2: Dot-dot segments are never stripped or checked.
- Hint 3: Request /download?file=../server.js — the application's own source code is returned.

## Admin Panel

### [Beginner] Admin panel open to any logged-in user
- Objective: make the "Admin panel open to any logged-in user" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: The /admin page checks for a session — and trusts the hx_role cookie for the rest.
- Hint 2: Actually, look closer: any authenticated session reaches further than it should.
- Hint 3: Log in as an ordinary staff or client account and open /admin/users — the full user table with password hashes is listed.

### [Advanced] CSRF on admin user deactivation
- Objective: make the "CSRF on admin user deactivation" test flip to done on /tests by performing the real exploit against the running app.
- Hint 1: Admin actions are plain POSTs with no anti-CSRF token.
- Hint 2: The app's own marker check is missing on the admin deactivate endpoint entirely.
- Hint 3: POST /admin/users/<id>/deactivate with no hx_origin marker — the user is deactivated anyway.
