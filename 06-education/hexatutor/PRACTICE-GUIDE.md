# HexaTutor — Practice Guide

Challenges grouped by feature, then difficulty. Work them in the app; the /tests mission board shows the same challenges with hints revealed one at a time. Step-by-step help from the Lab Coach unlocks for a feature after at least 3 genuine attempts on that feature.

## Login & Authentication

### [Beginner] SQL Injection — Login Bypass
- **Objective:** Make the "auth-sqli" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A03:2021 Injection
- **Hint 1:** The login check is built by gluing your input into a query string.
- **Hint 2:** Try a single quote in the email field, then a condition that is always true.
- **Hint 3:** Email: ' OR '1'='1' -- with any password — you are logged in as the first user in the table (the admin).

### [Beginner] Brute Force — No Rate Limiting or Lockout
- **Objective:** Make the "auth-brute" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Hint 1:** Nothing slows you down, and nothing locks the account.
- **Hint 2:** Script 10 or more wrong passwords for one account and compare the responses.
- **Hint 3:** After 10 failures the app still answers with the same plain "invalid" message — no lockout, no CAPTCHA, no delay.

### [Beginner] Default Administrator Credentials Still Active
- **Objective:** Make the "auth-default" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Hint 1:** The demo ships with an admin account that was never changed.
- **Hint 2:** The login page itself names the demo administrator.
- **Hint 3:** admin@hexatutor.local with password admin123 — the shipped default still works.

### [Intermediate] User Enumeration via Forgot Password
- **Objective:** Make the "auth-enum" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Hint 1:** Compare the answers for accounts that exist and accounts that do not.
- **Hint 2:** The forgot-password page is chattier than it should be.
- **Hint 3:** Probe 5+ different emails on /forgot: real accounts get "reset link sent", unknown ones get a visibly different answer.

### [Intermediate] Predictable Password-Reset Token
- **Objective:** Make the "auth-reset" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Hint 1:** Ask for a reset for your own account and study the shape of the token.
- **Hint 2:** The token is computed from something an attacker already knows about the victim.
- **Hint 3:** Token = RST<userId>-<userId*137+42>. Compute the token for Carol (user id 4) yourself and reset her password without ever requesting a reset for her.

### [Intermediate] Session Role Cookie Tampering
- **Objective:** Make the "auth-cookie" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** The admin gate trusts something your own browser sends.
- **Hint 2:** Look at your cookies after logging in — one of them sounds like a role.
- **Hint 3:** Set the cookie hx_role=admin and open /admin while logged in as a student.

## Registration & Profile

### [Beginner] Weak Password Policy
- **Objective:** Make the "reg-weak" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Hint 1:** How short can a password be on this platform?
- **Hint 2:** Try registering with a one-character password.
- **Hint 3:** A password of "x" is accepted — there is no length or complexity rule at all.

### [Intermediate] Mass Assignment — Self-Assigned Admin Role
- **Objective:** Make the "reg-mass" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** The register form shows only a few fields, but the server reads more of the request than it displays.
- **Hint 2:** Add extra fields to the registration POST and see what sticks.
- **Hint 3:** Submit /register with an extra field role=admin — the new account is created as an administrator.

### [Intermediate] Stored XSS in Display Name
- **Objective:** Make the "reg-xss" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A03:2021 Injection
- **Hint 1:** Your display name is printed back on pages that other people — including admins — see.
- **Hint 2:** Names are rendered without output escaping.
- **Hint 3:** Register or rename yourself with the display name <script>alert(1)</script> and open a page that lists users.

### [Intermediate] CSRF on Profile Update
- **Objective:** Make the "reg-csrf" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** Profile updates never check where the request actually came from.
- **Hint 2:** Real pages make your browser carry a marker cookie; a forged cross-site request would not.
- **Hint 3:** POST /profile/update sending only your session cookie (no hx_origin marker) — your profile still changes.

## Tutor Search & Profiles

### [Beginner] Reflected XSS in Search
- **Objective:** Make the "search-xss" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A03:2021 Injection
- **Hint 1:** Your search text is echoed at the top of the results page.
- **Hint 2:** It is echoed without escaping.
- **Hint 3:** Search for <script>alert(1)</script> and look at the results page — the payload is in the page as live markup.

### [Intermediate] SQL Injection in Tutor Search
- **Objective:** Make the "search-sqli" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A03:2021 Injection
- **Hint 1:** Search glues your text into a query in the same careless way login does.
- **Hint 2:** An always-true condition makes every tutor match.
- **Hint 3:** Search for ' OR '1'='1 — every tutor is returned, whatever subject you asked for.

### [Intermediate] Tutor Private Data Exposure via Profile API
- **Objective:** Make the "profile-pii" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** The JSON tutor API returns more than the public profile page shows.
- **Hint 2:** Compare /api/tutors/<id> with what the website displays.
- **Hint 3:** The API includes each tutor’s private email address and phone number — and answers without any login.

## Session Booking

### [Beginner] Hourly Rate Tampering at Booking
- **Objective:** Make the "book-rate" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A04:2021 Insecure Design
- **Hint 1:** The booking form carries the price in a hidden field.
- **Hint 2:** Hidden fields are suggestions, not server-side truth.
- **Hint 3:** Book Tina (normally $40/h) with rate=1 — the session is created and charged at your price.

### [Beginner] Booking Confirmed Without Payment
- **Objective:** Make the "book-nopay" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A04:2021 Insecure Design
- **Hint 1:** Payment is "simulated" — but the server never checks that it happened at all.
- **Hint 2:** What if the card field is simply left out of the request?
- **Hint 3:** POST a booking with no card field: the session is confirmed anyway, marked unpaid but fully booked.

### [Intermediate] Cancel Another Student’s Session (IDOR)
- **Objective:** Make the "book-cancel" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** Cancelling a session checks that the session exists — not that it is yours.
- **Hint 2:** Session ids are small sequential numbers.
- **Hint 3:** As Alice, POST /sessions/2/cancel — session 2 belongs to Bob, and it is cancelled.

### [Intermediate] Negative Hours Quantity Tampering
- **Objective:** Make the "book-hours" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A04:2021 Insecure Design
- **Hint 1:** Hours are multiplied by the rate without any sanity check.
- **Hint 2:** What does a negative lesson cost?
- **Hint 3:** Book with hours=-2: the total becomes negative — and the booking is accepted.

## Reviews & Ratings

### [Beginner] Rating Value Manipulation (Out of Range)
- **Objective:** Make the "rev-rating" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A04:2021 Insecure Design
- **Hint 1:** Ratings are supposed to be 1 to 5 stars.
- **Hint 2:** The server trusts the number you send, whatever it is.
- **Hint 3:** Submit a review with rating=100 — the tutor’s average explodes, and the value is stored as sent.

### [Intermediate] Review Without Any Completed Session
- **Objective:** Make the "rev-nobook" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** Who is allowed to review a tutor? The server never asks.
- **Hint 2:** The review endpoint accepts any tutor id from any logged-in student.
- **Hint 3:** As Carol, review Tina — you have never had a session with her, yet the review is stored and shown.

## Messaging

### [Intermediate] Reading Another Pair’s Messages (IDOR)
- **Objective:** Make the "msg-idor" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** Thread pages check that you are logged in — nothing more.
- **Hint 2:** Thread ids are small sequential numbers.
- **Hint 3:** Open /messages/2 while logged in as Alice: the private thread between Bob and Tom is served in full.

### [Intermediate] Stored XSS in Message Body
- **Objective:** Make the "msg-xss" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A03:2021 Injection
- **Hint 1:** Message bodies are printed into the thread page exactly as stored.
- **Hint 2:** Send a message inside a thread you belong to.
- **Hint 3:** Send <script>alert(1)</script> as a message: it is stored, and it renders as live markup for the other participant.

## Earnings & Payouts

### [Intermediate] Another Tutor’s Earnings Exposed (IDOR)
- **Objective:** Make the "earn-idor" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** The earnings page takes a tutor id as a parameter.
- **Hint 2:** Your own id is not the only one it accepts.
- **Hint 3:** As Tina, open /tutor/earnings?tutorId=6 — Tom’s earnings, session by session, are shown.

### [Intermediate] Payout Request Above Balance Accepted
- **Objective:** Make the "earn-payout" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A04:2021 Insecure Design
- **Hint 1:** Payout requests are recorded — never checked against the tutor’s balance.
- **Hint 2:** Your balance is what your completed sessions actually earned.
- **Hint 3:** As Tina (balance $80 from one completed session), request a payout of $500: it is accepted in full.

## Admin Panel

### [Advanced] CSRF on Admin User-Role Change
- **Objective:** Make the "admin-csrf" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** Admin actions trust the admin’s browser completely.
- **Hint 2:** Changing a user’s role is a plain POST with no origin check.
- **Hint 3:** As admin, POST /admin/users/2/role with role=tutor and no hx_origin marker — Alice’s role changes.

## Platform & API

### [Beginner] Debug Endpoint Dumps the Whole User Table
- **Objective:** Make the "api-debug" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A05:2021 Security Misconfiguration
- **Hint 1:** Something was left behind for the developers and never removed.
- **Hint 2:** Try the obvious diagnostic path under /api.
- **Hint 3:** GET /api/debug dumps every user — including plaintext passwords — with no login at all.

### [Intermediate] Predictable API Token (Base64 of Email)
- **Objective:** Make the "api-token" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Hint 1:** The API accepts a Bearer token instead of a session cookie.
- **Hint 2:** The token is derived from something completely public about the user.
- **Hint 3:** Token = base64 of the user’s email address. Forge Bob’s and GET /api/profile — his account data is returned, no password involved.
