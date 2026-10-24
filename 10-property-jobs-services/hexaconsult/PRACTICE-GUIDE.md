# HexaConsult — Practice Guide (LAB 98)

Challenges grouped by feature, then difficulty. Each test flips only when the real exploit effect happens on the server.

## Login & Authentication

### SQL Injection Login Bypass (Beginner)
- Objective: make the server register the real effect of "SQL Injection Login Bypass" — observe it in the app and on /tests.
- Hint 1: The login form builds its query by gluing your input straight into a SQL string.
- Hint 2: Try a quote in the email field, then make the rest of the condition always true.
- Hint 3: Email: ' OR '1'='1' --  (with any password) comments out the password check entirely.

### Brute Force — No Rate Limiting or Lockout (Beginner)
- Objective: make the server register the real effect of "Brute Force — No Rate Limiting or Lockout" — observe it in the app and on /tests.
- Hint 1: How many wrong passwords can you try for one account in a row?
- Hint 2: Nothing slows you down — no counter, no lockout, no CAPTCHA.
- Hint 3: Submit 10+ failed logins for alice@test.local and notice the 10th is still processed normally.

### User Enumeration via Login & Forgot-Password Responses (Beginner)
- Objective: make the server register the real effect of "User Enumeration via Login & Forgot-Password Responses" — observe it in the app and on /tests.
- Hint 1: Compare the error message for an email that exists vs one that does not.
- Hint 2: The forgot-password form is just as talkative.
- Hint 3: Probe at least 5 different emails across login/forgot and watch the wording change.

### Published Demo Credentials Are Live Admin Credentials (Beginner)
- Objective: make the server register the real effect of "Published Demo Credentials Are Live Admin Credentials" — observe it in the app and on /tests.
- Hint 1: Read the login page carefully — it is very "helpful".
- Hint 2: The demo accounts listed are not sandboxed copies.
- Hint 3: Log in with the published admin demo credentials and you are the real admin.

### Predictable Password-Reset Token (Intermediate)
- Objective: make the server register the real effect of "Predictable Password-Reset Token" — observe it in the app and on /tests.
- Hint 1: Request one reset token and study its shape.
- Hint 2: The token is built from something you already know about the account.
- Hint 3: Token = HCN<userId>-<userId*137+42>. Compute it for Bob (id 6) — no email access needed.

### Role Cookie Tampering into the Consultant Hub (Intermediate)
- Objective: make the server register the real effect of "Role Cookie Tampering into the Consultant Hub" — observe it in the app and on /tests.
- Hint 1: After login, look at the cookies the app trusts.
- Hint 2: One cookie repeats your role — and the server believes the cookie, not the database.
- Hint 3: Set hx_role=consultant on a client account and open the Consultant Hub.

## Registration & Profile

### Weak Password Policy (1 Character Accepted) (Beginner)
- Objective: make the server register the real effect of "Weak Password Policy (1 Character Accepted)" — observe it in the app and on /tests.
- Hint 1: Register a new account and be lazy with the password.
- Hint 2: How short can you go before the form complains?
- Hint 3: A one-character password is accepted.

### Stored XSS in Display Name (Beginner)
- Objective: make the server register the real effect of "Stored XSS in Display Name" — observe it in the app and on /tests.
- Hint 1: Your display name is rendered on profile, directory and admin pages.
- Hint 2: Is it escaped anywhere?
- Hint 3: Register with a name like <script>alert(1)</script> and view your profile.

### Mass Assignment — Role & Rate Set at Registration (Intermediate)
- Objective: make the server register the real effect of "Mass Assignment — Role & Rate Set at Registration" — observe it in the app and on /tests.
- Hint 1: The registration handler binds every submitted field onto the new user record.
- Hint 2: What happens if you submit fields the form never showed?
- Hint 3: Add role=consultant and rate=999 to the registration POST — they are honoured.

### CSRF on Profile Update (Intermediate)
- Objective: make the server register the real effect of "CSRF on Profile Update" — observe it in the app and on /tests.
- Hint 1: The app sets an hx_origin marker cookie on its own pages — but does the profile endpoint check it?
- Hint 2: A profile update POST with no marker at all still succeeds.
- Hint 3: POST to /profile from a bare request (no cookies except the session) and the name changes.

## Consultants & Search

### Reflected XSS in Search (Beginner)
- Objective: make the server register the real effect of "Reflected XSS in Search" — observe it in the app and on /tests.
- Hint 1: Your search term is echoed in the results heading.
- Hint 2: Try a term that is also HTML.
- Hint 3: Search for <script>alert(1)</script> and view the page source.

### Unlisted Consultant Profile Accessible by Direct ID (Beginner)
- Objective: make the server register the real effect of "Unlisted Consultant Profile Accessible by Direct ID" — observe it in the app and on /tests.
- Hint 1: The directory hides one consultant — but hiding is not protecting.
- Hint 2: Profile URLs use sequential IDs.
- Hint 3: Open /consultant/4 directly and read the unlisted profile and internal notes.

### SQL Injection in Consultant Search (Intermediate)
- Objective: make the server register the real effect of "SQL Injection in Consultant Search" — observe it in the app and on /tests.
- Hint 1: Search is glued into a query string just like the login form.
- Hint 2: An always-true condition dumps rows the search normally hides.
- Hint 3: Search for ' OR '1'='1' --  and meet the unlisted consultant.

## Appointments & Booking

### Appointment IDOR — View Another Client's Booking (Beginner)
- Objective: make the server register the real effect of "Appointment IDOR — View Another Client's Booking" — observe it in the app and on /tests.
- Hint 1: Your appointment page has a tidy sequential URL.
- Hint 2: Does it check the appointment belongs to you?
- Hint 3: Log in as Alice and open /appointment/1 — it is Bob's booking with Sara.

### Consultant Rate Tampering at Booking (Beginner)
- Objective: make the server register the real effect of "Consultant Rate Tampering at Booking" — observe it in the app and on /tests.
- Hint 1: The booking form helpfully pre-fills the consultant's hourly rate.
- Hint 2: The server trusts whatever rate comes back.
- Hint 3: Book Sara (rate 200) with rate=1 and the appointment total is $1.

### Double-Booking — Same Consultant, Same Slot, Twice (Intermediate)
- Objective: make the server register the real effect of "Double-Booking — Same Consultant, Same Slot, Twice" — observe it in the app and on /tests.
- Hint 1: Sara already has a booking on 2026-11-02 at 10:00 (it is in the seed data).
- Hint 2: The booking endpoint never checks for a clash.
- Hint 3: Book Sara for 2026-11-02 10:00 as another client — both bookings stand.

## Engagements

### Engagement IDOR — Read Another Client's Engagement (Beginner)
- Objective: make the server register the real effect of "Engagement IDOR — Read Another Client's Engagement" — observe it in the app and on /tests.
- Hint 1: Engagement pages use sequential IDs too.
- Hint 2: No party check is performed on read.
- Hint 3: As Alice, open /engagement/2 — Bob's finance review, fee and all.

### Client Approves Own Milestone via Consultant-Only Endpoint (Intermediate)
- Objective: make the server register the real effect of "Client Approves Own Milestone via Consultant-Only Endpoint" — observe it in the app and on /tests.
- Hint 1: Milestone approval is a consultant action — in the UI.
- Hint 2: The endpoint itself only checks that you are logged in.
- Hint 3: As the client, POST to /engagement/1/milestone/approve and approve your own deliverable.

### Cancel Another Party's Engagement (Intermediate)
- Objective: make the server register the real effect of "Cancel Another Party's Engagement" — observe it in the app and on /tests.
- Hint 1: The cancel endpoint is as trusting as the approve one.
- Hint 2: You do not need to be a party to the engagement at all.
- Hint 3: As Carol, POST /engagement/2/cancel to cancel Bob's engagement.

## Reports & Deliverables

### Deliverable Download IDOR (Beginner)
- Objective: make the server register the real effect of "Deliverable Download IDOR" — observe it in the app and on /tests.
- Hint 1: Deliverable files have predictable names tied to engagement numbers.
- Hint 2: The download endpoint never asks whose engagement it is.
- Hint 3: As Alice, download deliverable-2.txt — Bob's report.

### Path Traversal on Deliverable Download (Intermediate)
- Objective: make the server register the real effect of "Path Traversal on Deliverable Download" — observe it in the app and on /tests.
- Hint 1: The file parameter is joined straight onto the files directory.
- Hint 2: What escapes a directory? Two dots and a slash.
- Hint 3: Request /download?file=../server.js and read the application source.

## Invoices & Payments

### Invoice IDOR — View Another Client's Invoice (Beginner)
- Objective: make the server register the real effect of "Invoice IDOR — View Another Client's Invoice" — observe it in the app and on /tests.
- Hint 1: Invoices follow the same sequential pattern.
- Hint 2: No ownership check on view.
- Hint 3: As Alice, open /invoice/2 to see Bob's fee.

### Invoice Payment Amount Tampering ($1 Settles $4,000) (Beginner)
- Objective: make the server register the real effect of "Invoice Payment Amount Tampering ($1 Settles $4,000)" — observe it in the app and on /tests.
- Hint 1: The pay form lets you type the amount — and the server believes you.
- Hint 2: It marks the invoice PAID if your amount is "accepted".
- Hint 3: Pay invoice 1 with amount=1 and watch a $4,000 invoice settle in full.

## Admin Panel

### Admin Panel Open to Any Logged-In User (Beginner)
- Objective: make the server register the real effect of "Admin Panel Open to Any Logged-In User" — observe it in the app and on /tests.
- Hint 1: There is an /admin page. The nav hides it from you.
- Hint 2: Hiding is all that protects it.
- Hint 3: Log in as any client and open /admin — full user list, passwords included.

## Platform & API

### Unauthenticated /api/debug Dumps All Accounts (Beginner)
- Objective: make the server register the real effect of "Unauthenticated /api/debug Dumps All Accounts" — observe it in the app and on /tests.
- Hint 1: Developers leave presents. Try the obvious debug path.
- Hint 2: No session is required at all.
- Hint 3: GET /api/debug returns every user, including passwords, with no login.

### API Token Is Just base64(email) (Intermediate)
- Objective: make the server register the real effect of "API Token Is Just base64(email)" — observe it in the app and on /tests.
- Hint 1: The JSON API accepts a Bearer token instead of a session.
- Hint 2: The token format is an encoding, not a secret.
- Hint 3: Send Authorization: Bearer <base64 of bob@test.local> to /api/engagements — no password needed.
