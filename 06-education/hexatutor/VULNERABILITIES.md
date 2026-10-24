# HexaTutor — Vulnerabilities (full test registry)

LAB 54 · Category 6: Education & E-learning · Port 3063

Every entry below is a scored test in the lab system. A test completes only when the exploit actually succeeds and the server detects its real effect — never by self-declaration.

## Login & Authentication

### SQL Injection — Login Bypass
- **Test id:** `auth-sqli`
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **What it is:** String-built queries let attacker input change the meaning of the query itself — authentication falls without any password being guessed.
- **Exploitation outline:** Go to /login. In the email field type ' OR '1'='1' -- and any password, then submit. The string-built query matches the first user row, so a session is created without knowing any real password.
- **Impact:** On a real client site this is a full account takeover of the first account in the table — usually the administrator — from the public login page, no credentials needed.

### Brute Force — No Rate Limiting or Lockout
- **Test id:** `auth-brute`
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **What it is:** Without throttling, lockout or MFA, an attacker can try unlimited passwords against any account at machine speed.
- **Exploitation outline:** Pick one account (e.g. alice@hexatutor.local) and submit 10 wrong passwords in a row. Every attempt is processed at full speed; watch the 10th failure — the app still does not lock or throttle.
- **Impact:** A client’s users can be password-sprayed or credential-stuffed indefinitely; weak passwords will eventually fall and accounts are taken over.

### User Enumeration via Forgot Password
- **Test id:** `auth-enum`
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Intermediate
- **What it is:** Different responses for existing vs non-existing accounts hand attackers a verified list of targets for phishing and password attacks.
- **Exploitation outline:** Go to /forgot and submit at least 5 different email addresses, mixing real accounts (alice@hexatutor.local) with invented ones (ghost@nowhere.test). Note the different responses — that difference is an account-existence oracle.
- **Impact:** Attackers can harvest a client’s real user list, then aim password spraying and phishing precisely at accounts that exist.

### Default Administrator Credentials Still Active
- **Test id:** `auth-default`
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **What it is:** Default and demo credentials are public knowledge; leaving them active is the same as publishing the admin password.
- **Exploitation outline:** On /login, sign in as admin@hexatutor.local with the password admin123. Those are the credentials the demo shipped with, and they were never rotated.
- **Impact:** Anyone on the internet can try the well-known default and own the client’s admin panel — full control of users, money and data.

### Predictable Password-Reset Token
- **Test id:** `auth-reset`
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Intermediate
- **What it is:** Reset tokens must be unguessable random values; a token derived from a public user id is an account-takeover formula.
- **Exploitation outline:** The reset token for a user is RST<id>-<id*137+42>. For Carol (id 4) that is one short calculation. Go to /reset, enter her email, the token you computed, and a new password — the account is yours, and no reset was ever requested for her.
- **Impact:** Any user’s password can be reset by anyone who can see a user id — silent, complete account takeover on a real client platform.

### Session Role Cookie Tampering
- **Test id:** `auth-cookie`
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Authorisation data must live server-side; anything the client sends (cookies, hidden fields) can be rewritten by the client.
- **Exploitation outline:** Log in as any student. In your browser (or with curl) set the cookie hx_role=admin, then open /admin. The server believes the client-supplied role cookie instead of the session, and the admin panel opens.
- **Impact:** Every registered user of a client site can promote themselves to administrator just by editing a cookie — total platform compromise.

## Registration & Profile

### Mass Assignment — Self-Assigned Admin Role
- **Test id:** `reg-mass`
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Binding request data directly to data models lets attackers set fields the UI never offered — role, balance, verification flags.
- **Exploitation outline:** Register a new account, but add role=admin to the POST body alongside name/email/password. The server copies request fields straight onto the new user record, so the account is born an admin. Log in and open /admin.
- **Impact:** Self-service admin creation on a client platform: the attacker skips every approval process and owns the system from a public form.

### Weak Password Policy
- **Test id:** `reg-weak`
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **What it is:** A password policy is the cheapest defence in depth; without one, users choose passwords that fall to the first guessing attempt.
- **Exploitation outline:** Go to /register and create an account with the password x (a single character). The account is created without complaint.
- **Impact:** Client users with one-character passwords are brute-forced in seconds, and the client owns the breach headlines and the support cost.

### Stored XSS in Display Name
- **Test id:** `reg-xss`
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **What it is:** Stored XSS turns one user’s profile field into code that runs in every viewer’s browser — including administrators’.
- **Exploitation outline:** Register a new account (or update your profile) with the display name <script>alert(1)</script>. The payload is stored and rendered unescaped wherever names are shown, e.g. the admin user list and message threads.
- **Impact:** An attacker can steal admin sessions or act as the admin on a client site, pivoting one profile field into full control.

### CSRF on Profile Update
- **Test id:** `reg-csrf`
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** State-changing endpoints must verify the request’s origin (anti-CSRF token); cookies alone are sent by the browser for any site.
- **Exploitation outline:** While logged in, send POST /profile/update with a new name but WITHOUT the hx_origin marker cookie your browser normally carries (e.g. with curl). The change is applied — any website you visit while logged in could do the same.
- **Impact:** A malicious page a client’s user merely visits can silently rewrite their profile — and on other endpoints, far worse.

## Tutor Search & Profiles

### SQL Injection in Tutor Search
- **Test id:** `search-sqli`
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **What it is:** Any input that reaches a query is an injection surface — search boxes are among the most commonly missed.
- **Exploitation outline:** On the home page search box, enter ' OR '1'='1 and submit. The result lists every tutor on the platform, including ones whose subjects do not match the search at all.
- **Impact:** Search injection on a client site is a stepping stone to dumping the whole database: users, emails, payment data.

### Reflected XSS in Search
- **Test id:** `search-xss`
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **What it is:** Reflected input must be encoded for the context it lands in; echoing a query back raw is a script-injection gift.
- **Exploitation outline:** Search for <script>alert(1)</script>. The results page prints "Results for …" with your text rendered as raw HTML/JS, executing in the browser of anyone who opens that link.
- **Impact:** Attackers send crafted links to a client’s users; the script runs as the trusted site, stealing sessions and data.

### Tutor Private Data Exposure via Profile API
- **Test id:** `profile-pii`
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** APIs must return only the fields the caller is authorised to see; serialising the whole record leaks private data by default.
- **Exploitation outline:** Open /api/tutors/5 in a fresh browser (no login). The JSON includes the tutor’s private email and phone number, fields the public website never displays.
- **Impact:** A client’s entire tutor/teacher contact list can be scraped anonymously for spam, phishing and poaching.

## Session Booking

### Hourly Rate Tampering at Booking
- **Test id:** `book-rate`
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **What it is:** Prices must be recomputed server-side from the catalogue; any price arriving from the client is attacker-controlled.
- **Exploitation outline:** Open Tina’s profile and book a session, but change the hidden rate field to 1 before submitting (browser dev tools or curl). The server books the session at $1/hour and never checks the tutor’s real rate.
- **Impact:** Customers buy a client’s services for pennies — direct revenue loss on every order until someone reconciles the books.

### Booking Confirmed Without Payment
- **Test id:** `book-nopay`
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **What it is:** A business invariant ("no confirmed booking without payment") must be enforced by the server at the moment of booking, not assumed from the UI flow.
- **Exploitation outline:** Book a session via POST /book with tutor, slot, hours and rate — but omit the card field entirely. The booking is created as a confirmed session with nothing paid.
- **Impact:** Free services at scale: a client’s calendar fills with unpaid bookings and real paying customers are crowded out.

### Cancel Another Student’s Session (IDOR)
- **Test id:** `book-cancel`
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Every object access must check that the object belongs to (or is shared with) the caller — unguessable ids are not an authorisation check.
- **Exploitation outline:** Log in as Alice and send POST /sessions/2/cancel. Session 2 is Bob’s booking with Tina. The server cancels it without ever checking ownership.
- **Impact:** Any user can sabotage every other customer’s bookings on a client platform — support chaos and refunds follow.

### Negative Hours Quantity Tampering
- **Test id:** `book-hours`
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **What it is:** Quantities are business inputs too: they need range validation (positive, sane maximums) before they touch money math.
- **Exploitation outline:** Book a session with hours=-2. The server multiplies rate × hours, stores a session with a negative total, and confirms it — the platform now notionally owes the student money.
- **Impact:** Negative-quantity abuse corrupts a client’s billing and payouts — refunds, credits and reports all built on poisoned totals.

## Reviews & Ratings

### Review Without Any Completed Session
- **Test id:** `rev-nobook`
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Eligibility rules ("only students who completed a session may review") are authorisation logic and must be enforced server-side.
- **Exploitation outline:** Log in as Carol and POST /reviews with tutorId=5 (Tina), a rating and a comment. Carol has no completed session with Tina, but the review is saved and displayed on Tina’s profile.
- **Impact:** Fake reviews destroy trust in a client’s marketplace — competitors can tank a tutor, or boost themselves, at will.

### Rating Value Manipulation (Out of Range)
- **Test id:** `rev-rating`
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **What it is:** Every numeric input has a domain; validating ranges is part of the business logic, not a UI nicety.
- **Exploitation outline:** POST a review with rating=100 (or -5). The value is stored verbatim and fed into the tutor’s average rating, which now shows an absurd number.
- **Impact:** Ratings are a client’s shop window — one request can make any seller look perfect or terrible, misleading every customer.

## Messaging

### Reading Another Pair’s Messages (IDOR)
- **Test id:** `msg-idor`
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Private conversations are objects too: participant checks are mandatory on every read, not just on write.
- **Exploitation outline:** Log in as Alice and open /messages/2. Thread 2 belongs to Bob and Tom; Alice is not a participant, but the whole conversation is rendered for her.
- **Impact:** Every private conversation on a client platform is public to any registered user — a serious privacy breach and regulatory problem.

### Stored XSS in Message Body
- **Test id:** `msg-xss`
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **What it is:** Chat and messaging surfaces are stored-XSS goldmines: every participant’s browser trusts the thread page completely.
- **Exploitation outline:** In one of your own threads (e.g. Alice in thread 1), send the message <script>alert(1)</script>. Open the thread — the payload is in the page as executable markup, served to every participant.
- **Impact:** An attacker messages a client’s staff or customers and runs script in their sessions — account actions performed as the victim.

## Earnings & Payouts

### Another Tutor’s Earnings Exposed (IDOR)
- **Test id:** `earn-idor`
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Financial data needs the strictest ownership checks; a query parameter is not proof of identity.
- **Exploitation outline:** Log in as Tina (tutor) and open /tutor/earnings?tutorId=6. The page happily renders Tom’s earnings data, because the parameter is never checked against the session.
- **Impact:** Sellers on a client marketplace can spy on each other’s income — competitive harm and a privacy incident in one request.

### Payout Request Above Balance Accepted
- **Test id:** `earn-payout`
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **What it is:** Money-out flows must re-verify the balance server-side at request time; the displayed balance is not a control.
- **Exploitation outline:** Log in as Tina and POST /tutor/payout with amount=500. Her real balance is $80. The payout is recorded as pending for the full $500 — no balance check anywhere.
- **Impact:** Direct financial theft on a client platform: sellers withdraw money they never earned, discovered only at reconciliation.

## Admin Panel

### CSRF on Admin User-Role Change
- **Test id:** `admin-csrf`
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Advanced
- **What it is:** Privileged actions need CSRF tokens most of all: the more powerful the victim’s session, the more valuable the forgery.
- **Exploitation outline:** Log in as the admin, then send POST /admin/users/2/role {role: "tutor"} WITHOUT the hx_origin marker cookie (e.g. with curl). The role change is applied — a malicious page the admin visits could submit the same request silently.
- **Impact:** One visited link can hand an attacker chosen roles on a client platform — promote an accomplice, demote the real admins.

## Platform & API

### Predictable API Token (Base64 of Email)
- **Test id:** `api-token`
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Intermediate
- **What it is:** Tokens must be high-entropy secrets; anything derivable from public data is not a credential, it is an encoding.
- **Exploitation outline:** Compute base64("bob@hexatutor.local") and send GET /api/profile with header Authorization: Bearer <that value>. The API resolves it to Bob and returns his profile — the "token" is just his public email encoded.
- **Impact:** Every API account on a client platform is open to anyone who knows an email address — emails are public by design.

### Debug Endpoint Dumps the Whole User Table
- **Test id:** `api-debug`
- **OWASP:** A05:2021 Security Misconfiguration
- **Difficulty:** Beginner
- **What it is:** Debug and diagnostic endpoints are production attack surface; if it can dump data, it must not ship — or must be locked down like the admin panel.
- **Exploitation outline:** Open /api/debug in a browser with no session. The endpoint returns the full user table, emails and plaintext passwords included, left over from development.
- **Impact:** A client’s entire credential list is one URL away from the public internet — every account falls at once.
