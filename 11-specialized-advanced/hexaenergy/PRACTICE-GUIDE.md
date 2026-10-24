# HexaEnergy (LAB 106) — Practice Guide

Challenges grouped by feature, then difficulty. Each challenge is complete when its test flips to done on the Mission Board (`/tests`). Every challenge has 3 graded hints.

## Login & Authentication

### [Beginner] Brute force — no rate limit or lockout
- **Objective:** Make the "Brute force — no rate limit or lockout" test show ✓ on /tests by performing the real exploit (POST /login).
- **Hint 1:** Pick one real account and keep guessing its password.
- **Hint 2:** Notice that failed attempts never slow down, CAPTCHA or lock the account.
- **Hint 3:** Submit 10 or more wrong passwords for the same account — every one is still processed.

### [Beginner] User enumeration via login and forgot-password responses
- **Objective:** Make the "User enumeration via login and forgot-password responses" test show ✓ on /tests by performing the real exploit (POST /login, POST /forgot).
- **Hint 1:** Compare the error message for an email that exists with one that does not.
- **Hint 2:** The forgot-password form answers differently too — that difference is an oracle.
- **Hint 3:** Probe at least 5 different email addresses across login / forgot and collect which ones are registered.

### [Beginner] Published demo credentials grant a live account
- **Objective:** Make the "Published demo credentials grant a live account" test show ✓ on /tests by performing the real exploit (Login page / POST /login).
- **Hint 1:** Read the login page carefully — it helpfully prints a demo account.
- **Hint 2:** Demo accounts in production are real accounts with real data access.
- **Hint 3:** Sign in with the demo credentials printed on the login page.

### [Intermediate] SQL injection login bypass
- **Objective:** Make the "SQL injection login bypass" test show ✓ on /tests by performing the real exploit (POST /login).
- **Hint 1:** The login form builds its database query by gluing your input straight into a string.
- **Hint 2:** Try an email that closes the quote and adds an always-true condition.
- **Hint 3:** Email: ' OR '1'='1' --  (with any password) comments out the password check and logs you in as the first user in the table.

### [Intermediate] Predictable password-reset token
- **Objective:** Make the "Predictable password-reset token" test show ✓ on /tests by performing the real exploit (POST /reset).
- **Hint 1:** Reset tokens here follow a pattern built from the account ID.
- **Hint 2:** The token looks like EN<id>-<a number you can compute from the id>.
- **Hint 3:** For user id N the token is EN<N>-<N*137+42>. Compute one for an account that never requested a reset and post it to /reset with a new password.

### [Intermediate] Role cookie tampering reaches the staff console
- **Objective:** Make the "Role cookie tampering reaches the staff console" test show ✓ on /tests by performing the real exploit (GET /staff).
- **Hint 1:** After login, look at the cookies the app sets — one of them carries your role.
- **Hint 2:** The staff console trusts that cookie instead of the server-side session.
- **Hint 3:** Keep your customer session but change the hx_role cookie to meterreader and open /staff.

## Registration & Profile

### [Beginner] Weak password policy accepts 1-character passwords
- **Objective:** Make the "Weak password policy accepts 1-character passwords" test show ✓ on /tests by performing the real exploit (POST /register).
- **Hint 1:** Try registering with the shortest password the form will take.
- **Hint 2:** There is no minimum length or complexity check at all.
- **Hint 3:** Register a new account with a 1–3 character password — it is accepted.

### [Intermediate] Mass assignment — role and balance set at registration
- **Objective:** Make the "Mass assignment — role and balance set at registration" test show ✓ on /tests by performing the real exploit (POST /register).
- **Hint 1:** The registration handler copies every posted field onto the new account.
- **Hint 2:** Fields the form never shows — like role or balance — are copied too.
- **Hint 3:** Register while also posting role=admin and balance=9999, then check your new account.

### [Intermediate] Stored XSS in display name
- **Objective:** Make the "Stored XSS in display name" test show ✓ on /tests by performing the real exploit (POST /register, POST /profile).
- **Hint 1:** Your display name is rendered on pages other people — including admins — open.
- **Hint 2:** The name is printed without escaping, so HTML in it becomes live markup.
- **Hint 3:** Set your display name to a script payload such as <script>alert(1)</script> and save it.

### [Intermediate] CSRF on profile update
- **Objective:** Make the "CSRF on profile update" test show ✓ on /tests by performing the real exploit (POST /profile).
- **Hint 1:** The app sets a benign hx_origin cookie on its own pages as an origin marker.
- **Hint 2:** The profile endpoint never checks that marker, so a cross-site form post works.
- **Hint 3:** Submit a profile change with your session cookie but WITHOUT the hx_origin cookie — it is accepted as a forged request.

## Meters & Readings

### [Beginner] Meter IDOR — another customer's meter and address
- **Objective:** Make the "Meter IDOR — another customer's meter and address" test show ✓ on /tests by performing the real exploit (GET /meter/:id).
- **Hint 1:** Meter pages live at predictable sequential URLs.
- **Hint 2:** The server never checks that the meter belongs to you.
- **Hint 3:** Open a meter ID that is not yours — you get its address, tariff and reading history.

### [Intermediate] Backwards meter reading accepted — usage erased
- **Objective:** Make the "Backwards meter reading accepted — usage erased" test show ✓ on /tests by performing the real exploit (POST /meter/:id/reading).
- **Hint 1:** A meter reading should only ever move forwards.
- **Hint 2:** The endpoint accepts any number you send, even below the last reading.
- **Hint 3:** Submit a reading lower than your meter's last reading and watch the bill it creates.

### [Intermediate] Submit a reading for someone else's meter
- **Objective:** Make the "Submit a reading for someone else's meter" test show ✓ on /tests by performing the real exploit (POST /meter/:id/reading).
- **Hint 1:** Reading submissions take a meter ID in the URL.
- **Hint 2:** Ownership is not checked on the write path either.
- **Hint 3:** Post a new reading to a meter that belongs to another customer.

### [Advanced] Client-supplied usage figure overrides the real consumption
- **Objective:** Make the "Client-supplied usage figure overrides the real consumption" test show ✓ on /tests by performing the real exploit (POST /meter/:id/reading).
- **Hint 1:** The reading form computes usage in the browser and posts it along.
- **Hint 2:** The server trusts that posted usage instead of computing it from the readings.
- **Hint 3:** Submit a valid higher reading but post usage=0 — the invoice is created for 0 kWh.

### [Advanced] Switch a meter onto the internal unlisted tariff
- **Objective:** Make the "Switch a meter onto the internal unlisted tariff" test show ✓ on /tests by performing the real exploit (POST /meter/:id/tariff).
- **Hint 1:** There are more tariffs in the system than the public tariff page shows.
- **Hint 2:** The tariff-switch endpoint accepts any tariff ID, including internal ones.
- **Hint 3:** Find the internal feed-in tariff's ID and switch your meter to it — its rate is negative.

## Search & Catalogue

### [Beginner] Reflected XSS in search results
- **Objective:** Make the "Reflected XSS in search results" test show ✓ on /tests by performing the real exploit (GET /search?q=).
- **Hint 1:** Your search text is printed back at the top of the results page.
- **Hint 2:** It is printed without escaping.
- **Hint 3:** Search for <script>alert(1)</script> and see it reflected as live markup.

### [Intermediate] SQL injection in search dumps unlisted tariffs
- **Objective:** Make the "SQL injection in search dumps unlisted tariffs" test show ✓ on /tests by performing the real exploit (GET /search?q=).
- **Hint 1:** Search builds its query with your text inside a LIKE pattern.
- **Hint 2:** A quote in the search text breaks out of the pattern.
- **Hint 3:** Search for ' OR '1'='1' --  and the internal, unlisted tariff appears in the results.

## Billing & Invoices

### [Beginner] Invoice IDOR — another customer's bill
- **Objective:** Make the "Invoice IDOR — another customer's bill" test show ✓ on /tests by performing the real exploit (GET /invoice/:id).
- **Hint 1:** Invoices have sequential IDs.
- **Hint 2:** The invoice page never checks the invoice is yours.
- **Hint 3:** Open an invoice ID belonging to another customer to see their amount and usage.

### [Intermediate] Paying $1 settles a full invoice
- **Objective:** Make the "Paying $1 settles a full invoice" test show ✓ on /tests by performing the real exploit (POST /invoice/:id/pay).
- **Hint 1:** The payment form lets you type the amount yourself.
- **Hint 2:** The server marks the invoice PAID for any positive amount it receives.
- **Hint 3:** Pay $1 toward a large invoice — it flips to PAID IN FULL.

### [Intermediate] Negative payment credits the wallet
- **Objective:** Make the "Negative payment credits the wallet" test show ✓ on /tests by performing the real exploit (POST /invoice/:id/pay).
- **Hint 1:** Amounts are never checked for sign.
- **Hint 2:** A negative "payment" is processed like a refund — to you.
- **Hint 3:** Pay an invoice with amount=-50 and watch your account balance grow by $50.

## Connections & Support

### [Beginner] Service connection request IDOR
- **Objective:** Make the "Service connection request IDOR" test show ✓ on /tests by performing the real exploit (GET /connection/:id).
- **Hint 1:** Connection requests (new supply, upgrades) have sequential IDs.
- **Hint 2:** Their detail pages show the applicant's address and connection fee.
- **Hint 3:** Open a connection request that belongs to another customer.

### [Intermediate] Close another customer's support ticket
- **Objective:** Make the "Close another customer's support ticket" test show ✓ on /tests by performing the real exploit (POST /ticket/:id/close).
- **Hint 1:** The close-ticket action trusts the ticket ID in the URL.
- **Hint 2:** It never asks whether the ticket is yours.
- **Hint 3:** Close a support ticket opened by a different customer.

## Admin Panel

### [Beginner] Admin panel served to any logged-in customer
- **Objective:** Make the "Admin panel served to any logged-in customer" test show ✓ on /tests by performing the real exploit (GET /admin).
- **Hint 1:** Try the obvious admin URL while signed in as a normal customer.
- **Hint 2:** The panel only checks that *someone* is logged in.
- **Hint 3:** Open /admin as a customer — the full user list, including passwords, is rendered.

### [Intermediate] CSRF on admin tariff update
- **Objective:** Make the "CSRF on admin tariff update" test show ✓ on /tests by performing the real exploit (POST /admin/tariff/update).
- **Hint 1:** Admin actions are plain POSTs protected only by the session cookie.
- **Hint 2:** The benign hx_origin marker the app sets on its own pages is never verified.
- **Hint 3:** Post a tariff rate change with a session cookie but no hx_origin marker — the rate changes.

## Platform & API

### [Beginner] Unauthenticated /api/debug dumps all accounts
- **Objective:** Make the "Unauthenticated /api/debug dumps all accounts" test show ✓ on /tests by performing the real exploit (GET /api/debug).
- **Hint 1:** Debug endpoints often survive into production.
- **Hint 2:** This one needs no login at all.
- **Hint 3:** Open /api/debug in a private window — every user, including passwords, is returned as JSON.

### [Intermediate] API key is just base64(email)
- **Objective:** Make the "API key is just base64(email)" test show ✓ on /tests by performing the real exploit (GET /api/invoices (X-API-Key)).
- **Hint 1:** The JSON API authenticates with an X-API-Key header.
- **Hint 2:** The "key" is a trivial encoding of something public — the account email.
- **Hint 3:** Base64-encode another customer's email and call /api/invoices with it as X-API-Key — no password, no session.
