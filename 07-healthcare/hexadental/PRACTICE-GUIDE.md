# HexaDental — Practice Guide

Work the challenges feature by feature. Each challenge has three graded hints (nudge → stronger → near-answer), also shown on the in-lab Mission Board at `/tests`. A challenge is complete only when the exploit succeeds — the lab detects the real effect server-side. The Lab Coach chatbot gives step-by-step help for a feature after you have genuinely tried that feature at least 3 times.

## Login & Authentication

### [Beginner] SQL injection login bypass
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A03:2021 Injection
- **Hint 1:** The login form builds its lookup from your raw input — what happens with a quote in the email?
- **Hint 2:** Try a classic tautology payload in the email field, with any password.
- **Hint 3:** Use alice' OR '1'='1 as the email and any password — you should land in an account that is not yours.
- **Lesson:** String-built queries let an attacker rewrite the login logic itself; parameterised queries make input data, never code.

### [Beginner] Brute force — no rate limit or lockout
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Hint 1:** Pick one account and keep guessing its password.
- **Hint 2:** Nothing slows you down — no CAPTCHA, no delay, no lockout after many failures.
- **Hint 3:** Send at least 10 wrong passwords for bob@test.local in a row; every one is processed at full speed.
- **Lesson:** Without throttling, lockout or MFA, a login form is an unlimited password-guessing machine.

### [Beginner] User enumeration via differing responses
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Hint 1:** Compare what the site says for an email that exists vs one that does not.
- **Hint 2:** Try both the login form and the forgot-password form — one of them is chatty.
- **Hint 3:** Probe at least 5 different emails on /forgot: real accounts get "reset link sent", unknown ones get a different message.
- **Lesson:** Different answers for "no such user" and "wrong password" confirm which emails are registered — free targeting data for attackers.

### [Beginner] Default administrator credentials
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Hint 1:** Installs often ship with a well-known admin password that nobody changed.
- **Hint 2:** The admin email is admin@hexadental.local. What is the most common default password in the world?
- **Hint 3:** Sign in as admin@hexadental.local with the password admin123.
- **Lesson:** Default credentials are public knowledge; any unchanged default is an open door with a welcome mat.

### [Intermediate] Predictable password-reset token
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Hint 1:** Ask for a reset email and study the token format for two different accounts.
- **Hint 2:** The token looks like letters plus a number derived from something stable about the account.
- **Hint 3:** Tokens are HD-<userId x 271 + 13>. Bob is user 5, so compute his token and reset his password without ever requesting a reset for him.
- **Lesson:** Reset tokens must be long, random and single-use; a token you can compute is a password you can choose for anyone.

### [Intermediate] Session role cookie tampering
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** After login, inspect your cookies — your role travels with your browser.
- **Hint 2:** One cookie repeats your role back to the server, and the dentist area trusts it.
- **Hint 3:** As a patient, set the hx_role cookie to dentist and open /dentist — the server believes the cookie, not the account.
- **Lesson:** Authorization data must live server-side in the session; anything stored in a cookie is edited by its owner.

## Registration & Profile

### [Beginner] Weak password policy on registration
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Hint 1:** Register a new account and see how short a password the form accepts.
- **Hint 2:** There is no minimum length or complexity check at all.
- **Hint 3:** Register with a 1-character password such as "x" — it is accepted.
- **Lesson:** A password policy is the cheapest defence there is; without one, users pick passwords that fall in seconds.

### [Intermediate] Mass assignment — self-assigned staff role
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** The registration handler copies form fields straight into the new account record.
- **Hint 2:** What extra field could you add to the form that a normal browser never sends?
- **Hint 3:** Add role=dentist to the registration POST — the new account is created as a dentist.
- **Lesson:** Bind only whitelisted fields on signup and profile updates; trusting the whole request body invites privilege escalation.

### [Beginner] Stored XSS in display name
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A03:2021 Injection
- **Hint 1:** Names are shown on dashboards and staff views. Are they escaped?
- **Hint 2:** Put an HTML payload where a name goes — registration or profile.
- **Hint 3:** Register with the display name <script>alert(1)</script> — it is stored and rendered raw to viewers.
- **Lesson:** Every user-controlled string that reaches a page must be output-encoded; stored XSS fires in other people's browsers, including admins'.

### [Intermediate] CSRF on profile update
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** Legit profile forms carry a hidden hx_origin marker field. What if a request leaves it out?
- **Hint 2:** The server never actually verifies the marker on profile updates.
- **Hint 3:** POST to /profile/update as a logged-in user WITHOUT the hx_origin field — the change is accepted anyway.
- **Lesson:** State-changing forms need a verified anti-CSRF token; an unchecked marker is decoration, not defence.

## Appointments

### [Beginner] Appointment IDOR — view another patient's booking
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** Your appointment page has an id in the URL. IDs are small numbers.
- **Hint 2:** The server checks that you are logged in — but not that the booking is yours.
- **Hint 3:** As Alice, open /appointments/2 — that is Bob's appointment, served to you in full.
- **Lesson:** Every object access must verify ownership, not just login state.

### [Intermediate] Double-booking a taken slot
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A04:2021 Insecure Design
- **Hint 1:** Dr. Rahman already has a patient at 2026-11-02 10:00. What stops a second booking for the same slot?
- **Hint 2:** Nothing checks for an existing confirmed booking for that dentist, date and time.
- **Hint 3:** Book Dr. Rahman at 2026-11-02 10:00 for yourself — it is accepted alongside Alice's existing booking.
- **Lesson:** Capacity and uniqueness rules are security-relevant invariants; if the server never enforces them, the UI's greyed-out slots mean nothing.

### [Beginner] Cancel another patient's appointment
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** Cancelling posts to an appointment id. Whose id can you put there?
- **Hint 2:** Like the view page, the cancel action skips the ownership check.
- **Hint 3:** As Alice, POST /appointments/2/cancel — Bob's appointment is cancelled.
- **Lesson:** Write actions need the same ownership checks as reads — a destructive IDOR is worse than a reading one.

## Treatment Plans

### [Beginner] Treatment plan IDOR — another patient's plan and costs
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** Treatment plans live at /plans/<id> with small sequential ids.
- **Hint 2:** No ownership check stands between you and another patient's plan.
- **Hint 3:** As Bob, open /plans/1 — Alice's root-canal plan, items and total, all visible.
- **Lesson:** Medical treatment details are among the most sensitive data a business holds; IDOR here is a confidentiality breach, not a glitch.

### [Intermediate] Treatment cost tampering via client-supplied item price
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A04:2021 Insecure Design
- **Hint 1:** When a plan item is added, the price travels in the request. Does the server look up the real price?
- **Hint 2:** The catalogue has fixed prices — but the add-item form accepts any price you send.
- **Hint 3:** Add a Crown to a plan with price=1 instead of 450; the plan total drops to your price.
- **Lesson:** Prices must come from the server-side catalogue at the moment of the transaction; a client-sent price is a suggestion the attacker controls.

### [Intermediate] Patient approves their own treatment plan
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** Approval is a dentist action in the UI. Is it a dentist action on the server?
- **Hint 2:** The approve endpoint checks the plan exists — not who is asking.
- **Hint 3:** As Alice, POST /plans/1/approve on your own proposed plan — it becomes approved without any dentist.
- **Lesson:** Workflow roles must be enforced server-side per transition; hiding a button is not authorization.

### [Intermediate] Patient marks their own treatment complete
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** Completing a plan is what triggers final billing. Who can POST to the complete endpoint?
- **Hint 2:** Like approval, completion trusts any logged-in caller.
- **Hint 3:** As the plan's patient, POST /plans/<id>/complete — the treatment is recorded as done and ready to bill.
- **Lesson:** State machines are part of the attack surface: every transition needs an authorized actor and valid preconditions.

## Records & X-rays

### [Beginner] Clinical record IDOR — another patient's X-ray record
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** Record pages live at /records/<id>. Try a neighbour's id.
- **Hint 2:** Imaging and notes are served to any signed-in user who guesses the id.
- **Hint 3:** As Alice, open /records/2 — Bob's bitewing X-ray record and findings.
- **Lesson:** Health records demand per-object authorization; sequential ids plus no checks equal a public archive.

### [Intermediate] Path traversal on record download
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** The download endpoint takes a file name. What happens with ../ in it?
- **Hint 2:** The name is joined straight onto the records folder without sanitising.
- **Hint 3:** Request /download?file=../server.js — the application source code comes back.
- **Lesson:** Never build filesystem paths from raw user input; whitelist files or map ids to paths server-side.

## Invoices & Payment Plans

### [Beginner] Invoice IDOR — another patient's bill
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** Invoices live at /invoices/<id>, numbered from 1.
- **Hint 2:** Billing pages repeat the same missing ownership check.
- **Hint 3:** As Alice, open /invoices/2 — Bob's invoice, totals and payment state.
- **Lesson:** Financial documents need the same per-object checks as medical ones.

### [Intermediate] Invoice settled for $1 via payment amount tampering
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A04:2021 Insecure Design
- **Hint 1:** The pay form sends an amount. The invoice total is $1,100 — must the amount match it?
- **Hint 2:** The endpoint marks the invoice PAID for whatever amount arrives.
- **Hint 3:** POST /invoices/1/pay with amount=1 — a $1,100 invoice becomes PAID with $1 recorded.
- **Lesson:** Payment state must derive from verified amounts server-side; "paid" is a conclusion the server draws, not a parameter the client sends.

### [Intermediate] Payment plan terms forgery — 60 months at 0% APR
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A04:2021 Insecure Design
- **Hint 1:** Clinic policy: plans run at most 12 months at minimum 5% APR. Where is that policy enforced?
- **Hint 2:** Only in the form's dropdowns. The endpoint accepts any months and APR.
- **Hint 3:** Create a payment plan with months=60 and apr=0 — the forbidden terms are stored as agreed.
- **Lesson:** Business rules stated in the UI must be re-validated on the server; dropdown limits are not controls.

## Admin Panel

### [Beginner] Broken access control — all-invoices admin report open to any user
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** Admins have a finance report of every invoice. Guess its URL under /admin.
- **Hint 2:** That one page was wired up without the role check the rest of the panel has.
- **Hint 3:** As any patient, open /admin/invoices — every patient's invoices are listed.
- **Lesson:** Authorization must be applied route by route; one forgotten check exposes the whole dataset it serves.

### [Advanced] CSRF on admin user deactivation
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A01:2021 Broken Access Control
- **Hint 1:** The deactivate action is a POST the admin panel makes with an hx_origin marker — which is never checked.
- **Hint 2:** Reach /admin first (the role cookie decides who is "admin"), then look at the user actions.
- **Hint 3:** POST /admin/users/5/deactivate with no hx_origin field — Bob's account is deactivated by your request.
- **Lesson:** Privileged actions are the highest-value CSRF targets; unverified markers give a false sense of safety.

## Platform & API

### [Beginner] Unauthenticated debug endpoint dumps all accounts
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A05:2021 Security Misconfiguration
- **Hint 1:** Developers love leaving a status endpoint behind. Try the obvious API paths.
- **Hint 2:** One endpoint returns the whole user table — passwords included — with no login at all.
- **Hint 3:** Open /api/debug in a private window: every account and its plaintext password.
- **Lesson:** Debug and diagnostic endpoints are production vulnerabilities the day they ship; remove them or lock them down.

### [Intermediate] Forgeable API token — base64 of email
- **Objective:** Make the exploit succeed so the test flips to done on the Mission Board.
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Hint 1:** The API takes a Bearer token. Legit tokens look suspiciously readable.
- **Hint 2:** Decode one: it is just a prefix plus the account email, encoded.
- **Hint 3:** Send Authorization: Bearer hd_<base64 of bob@test.local> to /api/me — you are Bob, no password needed.
- **Lesson:** Tokens must be unguessable secrets issued by the server, never a reversible encoding of public identifiers.
