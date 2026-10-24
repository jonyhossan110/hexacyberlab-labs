# HexaEnergy (LAB 106) — Vulnerability Map

Every scored test in the lab, grouped by feature. This is the complete map of what the lab teaches testers to find.

## Login & Authentication

### SQL injection login bypass
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Location:** POST /login
- **How it is exploited:** Email: ' OR '1'='1' --  (with any password) comments out the password check and logs you in as the first user in the table.
- **Impact:** On a real utility portal this means instant takeover of the first account in the database — usually an administrator — with no password at all.

### Brute force — no rate limit or lockout
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login
- **How it is exploited:** Submit 10 or more wrong passwords for the same account — every one is still processed.
- **Impact:** Customer accounts fall to password spraying and credential stuffing, giving attackers control of billing, meter and personal data.

### User enumeration via login and forgot-password responses
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login, POST /forgot
- **How it is exploited:** Probe at least 5 different email addresses across login / forgot and collect which ones are registered.
- **Impact:** Attackers harvest valid customer emails for phishing and credential stuffing against the utility and other services.

### Published demo credentials grant a live account
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** Login page / POST /login
- **How it is exploited:** Sign in with the demo credentials printed on the login page.
- **Impact:** Anyone on the internet can walk into a live customer account and view or change energy account data.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Location:** POST /reset
- **How it is exploited:** For user id N the token is EN<N>-<N*137+42>. Compute one for an account that never requested a reset and post it to /reset with a new password.
- **Impact:** Every customer account can be taken over silently — the attacker only needs the victim's user ID.

### Role cookie tampering reaches the staff console
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /staff
- **How it is exploited:** Keep your customer session but change the hx_role cookie to meterreader and open /staff.
- **Impact:** Any customer can promote themselves to staff and see operational meter-reading tools and data meant only for employees.

## Registration & Profile

### Weak password policy accepts 1-character passwords
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /register
- **How it is exploited:** Register a new account with a 1–3 character password — it is accepted.
- **Impact:** Customer accounts are protected by passwords that fall in seconds, exposing billing and personal data.

### Mass assignment — role and balance set at registration
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /register
- **How it is exploited:** Register while also posting role=admin and balance=9999, then check your new account.
- **Impact:** Attackers mint administrator accounts or credit themselves balances, taking over the whole portal and its billing.

### Stored XSS in display name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Location:** POST /register, POST /profile
- **How it is exploited:** Set your display name to a script payload such as <script>alert(1)</script> and save it.
- **Impact:** An attacker can hijack staff or admin sessions and act inside the utility portal as that victim.

### CSRF on profile update
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /profile
- **How it is exploited:** Submit a profile change with your session cookie but WITHOUT the hx_origin cookie — it is accepted as a forged request.
- **Impact:** A malicious page a customer visits can silently change their profile details or email, setting up account recovery attacks.

## Meters & Readings

### Meter IDOR — another customer's meter and address
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /meter/:id
- **How it is exploited:** Open a meter ID that is not yours — you get its address, tariff and reading history.
- **Impact:** Customers can browse neighbours' addresses, tariffs and usage patterns — a privacy breach and burglary-relevant data.

### Backwards meter reading accepted — usage erased
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Location:** POST /meter/:id/reading
- **How it is exploited:** Submit a reading lower than your meter's last reading and watch the bill it creates.
- **Impact:** Customers can erase real consumption and cut their energy bills to near zero — direct revenue loss for the utility.

### Submit a reading for someone else's meter
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /meter/:id/reading
- **How it is exploited:** Post a new reading to a meter that belongs to another customer.
- **Impact:** Attackers can inflate a victim's bill or sabotage their account history with forged readings.

### Client-supplied usage figure overrides the real consumption
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Advanced
- **Location:** POST /meter/:id/reading
- **How it is exploited:** Submit a valid higher reading but post usage=0 — the invoice is created for 0 kWh.
- **Impact:** Customers pay for 0 kWh while consuming real energy — silent, scalable billing fraud.

### Switch a meter onto the internal unlisted tariff
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Advanced
- **Location:** POST /meter/:id/tariff
- **How it is exploited:** Find the internal feed-in tariff's ID and switch your meter to it — its rate is negative.
- **Impact:** Customers move onto staff-only or negative-rate tariffs and get paid to consume electricity.

## Search & Catalogue

### SQL injection in search dumps unlisted tariffs
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Location:** GET /search?q=
- **How it is exploited:** Search for ' OR '1'='1' --  and the internal, unlisted tariff appears in the results.
- **Impact:** Attackers enumerate internal tariffs, meters and customer data that were never meant to be public.

### Reflected XSS in search results
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** GET /search?q=
- **How it is exploited:** Search for <script>alert(1)</script> and see it reflected as live markup.
- **Impact:** Attackers craft links that run script in a logged-in customer's or agent's browser when clicked.

## Billing & Invoices

### Invoice IDOR — another customer's bill
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /invoice/:id
- **How it is exploited:** Open an invoice ID belonging to another customer to see their amount and usage.
- **Impact:** Customers' billing amounts, addresses and usage leak to any other customer — a privacy and trust failure.

### Paying $1 settles a full invoice
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Location:** POST /invoice/:id/pay
- **How it is exploited:** Pay $1 toward a large invoice — it flips to PAID IN FULL.
- **Impact:** Customers clear real energy bills for a dollar — direct, obvious revenue loss.

### Negative payment credits the wallet
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Location:** POST /invoice/:id/pay
- **How it is exploited:** Pay an invoice with amount=-50 and watch your account balance grow by $50.
- **Impact:** Attackers mint unlimited account credit from nothing and cash it out against real bills.

## Connections & Support

### Service connection request IDOR
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /connection/:id
- **How it is exploited:** Open a connection request that belongs to another customer.
- **Impact:** Home addresses and planned connection details of other customers leak, a privacy and safety issue.

### Close another customer's support ticket
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /ticket/:id/close
- **How it is exploited:** Close a support ticket opened by a different customer.
- **Impact:** Attackers can sabotage other customers' support cases, hiding faults and delaying repairs.

## Admin Panel

### Admin panel served to any logged-in customer
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /admin
- **How it is exploited:** Open /admin as a customer — the full user list, including passwords, is rendered.
- **Impact:** Every customer password and account detail is exposed to any registered user — total compromise.

### CSRF on admin tariff update
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /admin/tariff/update
- **How it is exploited:** Post a tariff rate change with a session cookie but no hx_origin marker — the rate changes.
- **Impact:** An attacker can change energy tariffs company-wide by tricking a signed-in admin into visiting a page.

## Platform & API

### API key is just base64(email)
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Location:** GET /api/invoices (X-API-Key)
- **How it is exploited:** Base64-encode another customer's email and call /api/invoices with it as X-API-Key — no password, no session.
- **Impact:** Anyone who knows a customer's email can pull their invoices through the API — mass data theft with a phone book.

### Unauthenticated /api/debug dumps all accounts
- **OWASP:** A05:2021 Security Misconfiguration
- **Difficulty:** Beginner
- **Location:** GET /api/debug
- **How it is exploited:** Open /api/debug in a private window — every user, including passwords, is returned as JSON.
- **Impact:** Complete credential dump of every customer and staff account to anyone who finds the URL.
