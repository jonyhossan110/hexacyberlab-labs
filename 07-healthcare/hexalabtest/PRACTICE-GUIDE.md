# HexaLabTest (LAB 64) — Practice Guide

Challenges grouped by feature, then difficulty. Complete each one by DOING it — the server detects the real exploit effect. Each challenge lists its 3 graded hints (also on /tests) and a measurable objective.

## Login & Authentication

### [Beginner] SQL injection login bypass
- **Objective:** Make the "SQL injection login bypass" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: The login form builds its database query by gluing your input straight into the query string.
- Hint 2: Try a quote character in the email field and see how the error/behaviour changes.
- Hint 3: Use email: ' OR '1'='1' -- with any password — the OR makes the row match and the comment eats the password check.

### [Beginner] Brute force — no rate limit or lockout
- **Objective:** Make the "Brute force — no rate limit or lockout" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Pick one account and keep guessing wrong passwords.
- Hint 2: Notice nothing slows down, locks, or challenges you — count your failures.
- Hint 3: After 10+ failed logins for the same account the app is still happily accepting guesses.

### [Beginner] User enumeration via login and forgot-password
- **Objective:** Make the "User enumeration via login and forgot-password" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Compare the login error for an email that exists vs one that does not.
- Hint 2: Do the same comparison on the forgot-password form.
- Hint 3: Probe at least 5 different emails — the responses tell you exactly which accounts exist.

### [Beginner] Default / demo admin credentials still active
- **Objective:** Make the "Default / demo admin credentials still active" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: The login page itself is generous with information.
- Hint 2: Read the "demo accounts" note under the login form.
- Hint 3: Sign in as the admin with the published demo password admin123.

### [Intermediate] Predictable password-reset token
- **Objective:** Make the "Predictable password-reset token" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Request a reset for your own account and study the token format.
- Hint 2: The token is derived from something predictable about the account — its numeric id.
- Hint 3: Tokens follow LT-<id x 137 + 42>. Compute one for a user who never requested a reset and use it.

### [Intermediate] Session role trusted from a client cookie
- **Objective:** Make the "Session role trusted from a client cookie" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Inspect the cookies the app sets after login — one of them describes who you are.
- Hint 2: The server believes that cookie instead of checking the account.
- Hint 3: Set hx_role=admin in your browser, then visit /admin.

## Registration & Profile

### [Beginner] Weak password policy (1 character accepted)
- **Objective:** Make the "Weak password policy (1 character accepted)" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Register a new account and be lazy with the password.
- Hint 2: There is no length or complexity check at all.
- Hint 3: A one-character password such as "x" is accepted.

### [Intermediate] Mass assignment — self-assign a staff role
- **Objective:** Make the "Mass assignment — self-assign a staff role" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: The registration handler binds the whole submitted form to the new account.
- Hint 2: Add a field the form never shows you: role.
- Hint 3: POST /register with role=doctor (or technician/admin) and the account is created with that role.

### [Beginner] Stored XSS in display name
- **Objective:** Make the "Stored XSS in display name" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Your display name is shown back on several pages — including staff pages.
- Hint 2: It is written into the page without encoding.
- Hint 3: Register (or rename yourself) with a name like <script>alert(1)</script> and it is stored and rendered raw.

### [Intermediate] CSRF on profile update
- **Objective:** Make the "CSRF on profile update" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Legitimate forms carry a hidden _origin marker that matches a cookie.
- Hint 2: The profile endpoint never actually verifies it.
- Hint 3: Submit a profile change with no _origin field (e.g. from a cross-site form) and it is accepted.

## Test Catalog & Search

### [Intermediate] SQL injection in catalog search dumps hidden tests
- **Objective:** Make the "SQL injection in catalog search dumps hidden tests" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Search filters tests by name using another hand-built query.
- Hint 2: A quote in the search box changes the query logic.
- Hint 3: Search for ' OR '1'='1 and the result set grows beyond the public catalogue — including the internal QA panel.

### [Beginner] Reflected XSS in catalog search
- **Objective:** Make the "Reflected XSS in catalog search" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Your search term is echoed in the results heading.
- Hint 2: It is echoed without encoding.
- Hint 3: Search for <script>alert(1)</script> and the payload comes straight back in the page.

## Test Orders

### [Beginner] Price tampering on test orders
- **Objective:** Make the "Price tampering on test orders" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: The order form carries each test’s price in a hidden field.
- Hint 2: The server trusts whatever price is submitted.
- Hint 3: Order the $55 Thyroid Panel with price_THYROID=1 and the bill becomes $1.

### [Beginner] Quantity tampering — negative quantities accepted
- **Objective:** Make the "Quantity tampering — negative quantities accepted" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Each ordered test also carries a qty field.
- Hint 2: Nothing checks that the quantity is sane.
- Hint 3: Submit qty=-2 for a test and the order total goes negative — the lab would owe YOU money.

### [Beginner] Order IDOR — read another patient’s order
- **Objective:** Make the "Order IDOR — read another patient’s order" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Order pages live at predictable URLs: /orders/<id>.
- Hint 2: The page checks that you are logged in — not that the order is yours.
- Hint 3: As Alice, open Bob’s order 1003 or 1004 directly.

### [Intermediate] Order status forged at creation (skip the lab workflow)
- **Objective:** Make the "Order status forged at creation (skip the lab workflow)" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: The order handler copies more of the form than it should.
- Hint 2: Add a field the form never shows: status.
- Hint 3: Create an order with status=Reported and it is born "Reported" — no sample, no lab, no doctor.

## Sample Tracking

### [Intermediate] Patient advances own sample status (missing role check)
- **Objective:** Make the "Patient advances own sample status (missing role check)" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Samples move Ordered → Sample Collected → In Lab → Results Ready → Reported.
- Hint 2: The status endpoint only checks that someone is logged in.
- Hint 3: As a patient, POST /orders/<your id>/status with the next status and it moves.

### [Beginner] Technician work queue visible to patients
- **Objective:** Make the "Technician work queue visible to patients" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Technicians have a queue page listing every sample in the lab.
- Hint 2: Its URL is guessable: /tech/queue.
- Hint 3: Open it while logged in as a patient — the whole queue, with patient names, is served.

## Results & Reports

### [Intermediate] Patient edits own results via the technician endpoint
- **Objective:** Make the "Patient edits own results via the technician endpoint" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Technicians enter results at POST /tech/results.
- Hint 2: The endpoint never checks the caller’s role.
- Hint 3: As Alice, POST results for your own order 1002 and change a value — it is stored.

### [Beginner] Report IDOR — download another patient’s report
- **Objective:** Make the "Report IDOR — download another patient’s report" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Reports live under the order: /orders/<id>/report.
- Hint 2: Same story as the order page — login is checked, ownership is not.
- Hint 3: As Alice, open the report for Bob’s order 1004.

### [Intermediate] Report downloadable before doctor review
- **Objective:** Make the "Report downloadable before doctor review" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Results pass two stages: technician entry, then doctor review. Only reviewed reports should reach patients.
- Hint 2: The report endpoint only checks that results exist.
- Hint 3: Your order 1002 is "Results Ready" but NOT reviewed — its report downloads anyway.

### [Intermediate] Path traversal in report file download
- **Objective:** Make the "Path traversal in report file download" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Report files are fetched through /files?name=…
- Hint 2: The name is joined to the files folder without sanitising "..".
- Hint 3: Request /files?name=../server.js and the application source code is served.

## Home Collection

### [Beginner] Home-collection booking IDOR — home address leak
- **Objective:** Make the "Home-collection booking IDOR — home address leak" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Home-collection bookings have their own pages: /collection/<id>.
- Hint 2: Ownership is not checked there either.
- Hint 3: As Alice, open booking 501 — Bob’s home address is shown.

### [Beginner] Home-collection fee tampering
- **Objective:** Make the "Home-collection fee tampering" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Booking a home collection charges a standard $15 fee — carried in a hidden field.
- Hint 2: The server accepts the submitted fee.
- Hint 3: Book with fee=0 and the collection is free.

## Admin Panel

### [Intermediate] CSRF on admin user deactivation
- **Objective:** Make the "CSRF on admin user deactivation" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: Admin actions are plain POSTs — and the _origin marker is never verified there either.
- Hint 2: A deactivation request without the marker still succeeds.
- Hint 3: POST /admin/deactivate for some user with no _origin field while signed in as admin.

## Platform & API

### [Intermediate] Weak API token — base64(email) unlocks all orders
- **Objective:** Make the "Weak API token — base64(email) unlocks all orders" test flip to done on /tests by performing the exploit end-to-end.
- Hint 1: The JSON API at /api/orders expects an x-api-token header.
- Hint 2: The token is not random — it is derived from something public about the user.
- Hint 3: Send x-api-token = base64 of any user’s email, with no session cookie at all.
