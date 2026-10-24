# HexaKids — Vulnerability Map (LAB 57)

The complete map of the 26 scored tests in this lab, grouped by feature. Every entry is a real, working vulnerability in the app, detected server-side when the exploit succeeds.

## Login & Authentication (6)

### SQL Injection Login Bypass
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** `POST /login`
- **Exploitation:** Submit an injection payload (e.g. ' OR '1'='1) as the email on the legacy string-built login query.
- **Impact:** On a real learning platform this hands an attacker the first account the query returns — here the admin — without any password.

### Brute Force — No Rate Limit or Lockout
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Location:** `POST /login`
- **Exploitation:** Send 10+ failed logins for one account; the app keeps accepting attempts with no throttle, delay or lockout.
- **Impact:** Parent accounts guard children's profiles and billing; unlimited guesses make weak passwords a matter of time.

### User Enumeration via Forgot Password
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Location:** `POST /forgot`
- **Exploitation:** Request a reset for an email that exists and for one that does not — the responses differ, confirming which emails hold accounts.
- **Impact:** Attackers can build a verified list of parent emails for phishing and credential stuffing against the platform.

### Published Demo Credentials Still Active
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Location:** `POST /login`
- **Exploitation:** Log in with the demo account printed in the README (demo@hexakids.local / demo123).
- **Impact:** Anyone who reads public documentation can walk into a real account with full parent privileges.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Intermediate
- **Location:** `POST /reset`
- **Exploitation:** The reset token is derived only from the user id (HK<id>-<checksum>); compute any user's token and reset their password without ever requesting one.
- **Impact:** Full account takeover of any parent or teacher by id alone — no inbox access needed.

### Session Role Cookie Tampering
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** `Cookie: hx_role`
- **Exploitation:** The server trusts the client-supplied hx_role cookie; set it to admin and open /admin with a parent session.
- **Impact:** Every parent becomes an admin — user management, billing and all children's data exposed.

## Registration & Profile (4)

### Weak Password Policy (1-Character Passwords)
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Location:** `POST /register`
- **Exploitation:** Register a new account with a 1-character password — it is accepted.
- **Impact:** Accounts protected by trivial passwords fall to the first guess in any credential attack.

### Mass Assignment — Self-Assigned Role and Premium Plan
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** `POST /register`
- **Exploitation:** Add role=teacher (or plan=premium) to the registration POST; the server binds the whole body onto the new account.
- **Impact:** Attackers self-register as teachers or premium members — instant privilege and free paid tiers.

### Stored XSS in Display Name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Location:** `POST /register, POST /profile`
- **Exploitation:** Register or update your profile with an HTML/JS payload as the display name; it is stored and rendered raw on the dashboard.
- **Impact:** An attacker can run script in a teacher's or admin's browser and hijack their session.

### CSRF on Profile Update
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** `POST /profile`
- **Exploitation:** Submit a profile change with a cross-site Origin (as a malicious site would from a logged-in victim's browser); no token is checked and the change is applied.
- **Impact:** Attackers silently rewrite a parent's profile (name, contact data) through a booby-trapped page.

## Children & Reports (3)

### Child Profile IDOR — Another Family's Child
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** `GET /children/:id`
- **Exploitation:** As one parent, open another family's child profile by changing the id (e.g. /children/201).
- **Impact:** Strangers can view children's names, ages and levels across the whole platform — a serious safeguarding failure.

### Progress Report IDOR
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** `GET /children/:id/report`
- **Exploitation:** Open the progress report of a child from another family by id.
- **Impact:** Detailed learning progress of other people's children leaks to any signed-in parent.

### Stars/Points Inflation via API
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** `POST /api/award`
- **Exploitation:** The award endpoint is meant for teachers giving ≤10 stars to their own class; call it as a parent for any child with any amount.
- **Impact:** The whole reward economy collapses — stars, levels and paid rewards can be forged at will.

## Activities & Rewards (3)

### Premium Activities Without a Subscription
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** `POST /activities/:id/complete`
- **Exploitation:** As a free-plan parent, complete a premium activity directly; the paywall is only visual.
- **Impact:** The entire paid content library is free to anyone who calls the endpoint — direct revenue loss.

### Quiz Answers Exposed via API
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** `GET /api/activities/:id/answers`
- **Exploitation:** Fetch the answer key for any activity; the API returns it to any logged-in user.
- **Impact:** Children (or parents) can ace every activity, destroying progress data the product sells to families and schools.

### Reward Redemption Without Enough Stars
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** `POST /rewards/:id/redeem`
- **Exploitation:** Redeem a reward costing more stars than the child has; the balance is never checked and goes negative.
- **Impact:** Paid-tier rewards are redeemed for free, and negative balances corrupt the whole points economy.

## Classes & Teachers (3)

### Teacher Access to Children Outside Their Class
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** `GET /children/:id`
- **Exploitation:** As a teacher, open the profile of a child who is not in any of your classes.
- **Impact:** Any teacher can browse every child on the platform — a safeguarding and privacy breach.

### Class Membership Forgery — Join Without Invite
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** `POST /classes/:id/join`
- **Exploitation:** Add a child to a teacher's class with a direct POST; the invite code and teacher approval are never checked.
- **Impact:** Attackers place any child into any class, exposing the child to an unknown adult's class space.

### Class Roster PII Exposure via API
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** `GET /api/classes/:id/roster`
- **Exploitation:** Fetch a class roster as an unrelated parent; it lists every child plus their parent's email.
- **Impact:** Bulk harvesting of children's names paired with parent contact emails — prime phishing/safeguarding risk.

## Subscriptions & Billing (2)

### Subscription Price Tampering
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** `POST /subscribe`
- **Exploitation:** Subscribe to Premium sending price=0 from the client; the server charges what the client claims.
- **Impact:** Every family gets Premium for free by editing one field — the subscription model is void.

### Billing Invoice IDOR
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** `GET /invoices/:id`
- **Exploitation:** Open another family's billing invoice by changing the invoice id.
- **Impact:** Payment history and plan details of every family leak to any signed-in user.

## Search (2)

### SQL Injection in Search Dumps All Children
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Location:** `GET /search?q=`
- **Exploitation:** Search with an injection payload; the string-built query returns children from every family, not just yours.
- **Impact:** One query enumerates the platform's entire child directory — names, ages, levels.

### Reflected XSS in Search
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** `GET /search?q=`
- **Exploitation:** The search term is echoed into the results page unescaped; a script payload in q is reflected raw.
- **Impact:** A crafted search link runs script in a victim parent's or admin's browser.

## Admin Panel (1)

### CSRF on Admin User Deactivation
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** `POST /admin/users/:id/deactivate`
- **Exploitation:** Trigger the admin deactivation action with a cross-site Origin and no token; the account is deactivated.
- **Impact:** An attacker can deactivate arbitrary accounts — including staff — via a booby-trapped page an admin visits.

## Platform & API (2)

### Predictable API Token (Base64 of Email)
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Intermediate
- **Location:** `GET /api/me with X-Api-Token`
- **Exploitation:** API tokens are just hk_ + base64(email); forge any user's token from their public email address.
- **Impact:** Anyone who knows a parent's email owns their API identity — full account data access.

### Unauthenticated Debug Endpoint Dumps All Users
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** `GET /api/debug`
- **Exploitation:** Fetch the leftover debug endpoint with no login at all; it returns every user including plaintext passwords.
- **Impact:** Complete credential dump of every parent, teacher and the admin — total platform compromise in one request.
