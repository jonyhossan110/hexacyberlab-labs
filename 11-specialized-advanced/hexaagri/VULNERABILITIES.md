# HexaAgri — Vulnerability Map (LAB 105)

Every scored test in the lab, grouped by feature. Each flaw is a real, working vulnerability in the app — tests complete only when the exploit's real effect happens server-side.

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Where:** Login & Authentication flows in server.js
- **Exploitation outline:** Use email: ' OR '1'='1' -- (with any password) — the -- comments out the password check.
- **Impact:** An attacker can sign in as any user — including the admin — without knowing a password, taking over accounts and everything they control.

### No Brute-Force Protection on Login
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Where:** Login & Authentication flows in server.js
- **Exploitation outline:** Submit 10+ wrong passwords for alice@greenvalley.local; the 10th is still processed normally.
- **Impact:** Attackers can crack weak farm-account passwords at machine speed, gaining access to business records and payments.

### User Enumeration via Login & Password Reset
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Where:** Login & Authentication flows in server.js
- **Exploitation outline:** Probe at least 5 different emails across login/forgot; the responses tell you which accounts are real.
- **Impact:** Attackers learn exactly which email addresses have accounts, focusing phishing and password attacks on real users.

### Published Demo Account With Default Password
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Where:** Login & Authentication flows in server.js
- **Exploitation outline:** Sign in with the nursery demo credentials printed on the login page.
- **Impact:** Anyone on the internet can walk into the demo farm's account and see or change real operational data.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Intermediate
- **Where:** Login & Authentication flows in server.js
- **Exploitation outline:** Tokens look like AG<id>-<id x 137 + 42>; compute one for another user and use it without ever requesting a reset.
- **Impact:** Anyone can reset any user's password — including the admin's — and take over the account in minutes.

### Role Cookie Trusted for Manager Access
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where:** Login & Authentication flows in server.js
- **Exploitation outline:** Set the hx_role cookie to manager (or admin) and visit /manager with a low-privilege account.
- **Impact:** Any signed-in user can open the manager console, seeing every farm's data and pending subsidy approvals.

## Registration & Profile

### Weak Password Policy at Registration
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Where:** Registration & Profile flows in server.js
- **Exploitation outline:** Create an account with the password 'a' — it is accepted.
- **Impact:** Users pick trivial passwords that attackers crack in seconds, exposing their farms and orders.

### Mass Assignment at Registration (Role & Balance)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where:** Registration & Profile flows in server.js
- **Exploitation outline:** POST /register with extra fields role=admin and balance=5000 — both are stored.
- **Impact:** Attackers register straight into admin accounts or gift themselves wallet balance, bypassing every business rule.

### Stored XSS in Display Name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Where:** Registration & Profile flows in server.js
- **Exploitation outline:** Register or update your profile with the name <img src=x onerror=alert(1)> and view a page that lists users.
- **Impact:** An attacker can run scripts in the browsers of staff and customers, stealing sessions and approvals.

## Farms & Search

### Farm Record IDOR (Another Owner's Farm)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Where:** Farms & Search flows in server.js
- **Exploitation outline:** As Alice, open /farms/2 — Sunridge Acres is served in full, including its internal notes.
- **Impact:** Competitors can read each other's yields, buyers and prices — commercially sensitive farming data leaks freely.

### SQL Injection in Farm Search
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Where:** Farms & Search flows in server.js
- **Exploitation outline:** Search for ' OR '1'='1 — every farm appears, including the unlisted Whispering Pines Agro.
- **Impact:** Attackers can dump the entire catalogue — including unlisted farms and their data — through the search box.

### Reflected XSS in Search
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Where:** Farms & Search flows in server.js
- **Exploitation outline:** Search for <script>alert(1)</script> and watch it land unescaped in the results heading.
- **Impact:** Attackers craft links that run scripts in a victim's browser under the site's trusted domain.

## Crops & Fields

### Edit Another Farm's Crop (IDOR)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Where:** Crops & Fields flows in server.js
- **Exploitation outline:** As Alice, POST a new name to /crops/3/edit — Bob's wheat crop is renamed.
- **Impact:** Rivals can sabotage each other's crop records, corrupting planning and sales data.

### Yield Figure Tampering
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Where:** Crops & Fields flows in server.js
- **Exploitation outline:** Set a crop's expected yield to 999999 — the inflated figure is stored and used for planning.
- **Impact:** Inflated yields distort inventory promises, subsidy claims and buyer contracts, creating real financial loss.

### Harvesting Another Farm's Field
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where:** Crops & Fields flows in server.js
- **Exploitation outline:** As Alice, POST /fields/3/harvest — Bob's field is harvested by a stranger.
- **Impact:** Attackers can trigger harvests on other farms, corrupting stock records and operations.

## Harvest Inventory

### Harvest Inventory Inflation
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Where:** Harvest Inventory flows in server.js
- **Exploitation outline:** Raise a lot from 400 kg to 5000 kg in one adjust — the phantom stock is now sellable.
- **Impact:** Phantom stock gets sold to buyers the farm cannot supply — refunds, penalties and lost contracts follow.

### Negative Inventory Accepted
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **Where:** Harvest Inventory flows in server.js
- **Exploitation outline:** Set a lot's quantity to -50 — the negative stock is stored.
- **Impact:** Negative stock breaks sales math and reporting, and can be combined with orders to create money from nothing.

## Sales & Orders

### Order Price Tampering
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **Where:** Sales & Orders flows in server.js
- **Exploitation outline:** Order lot 1 with price=1 — your invoice is computed at $1/kg instead of $32/kg.
- **Impact:** Buyers pay almost nothing for produce while invoices look legitimate — direct revenue theft.

### Overselling Beyond Available Stock
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Where:** Sales & Orders flows in server.js
- **Exploitation outline:** Order 100000 kg from a 400 kg lot — the order is accepted and stock goes negative.
- **Impact:** The platform promises produce that does not exist, causing failed deliveries and compensation claims.

### Sales Order IDOR
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Where:** Sales & Orders flows in server.js
- **Exploitation outline:** As Alice, open /orders/1 — Bob's order details are shown.
- **Impact:** Buyers' and farmers' deal terms, quantities and prices leak to competitors.

### Invoice IDOR
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Where:** Sales & Orders flows in server.js
- **Exploitation outline:** As Alice, open /invoices/1 — Bob's invoice is rendered in full.
- **Impact:** Invoices leak pricing and counterparty details and can be reused for invoice fraud.

## Equipment & Maintenance

### Self-Approved Equipment Maintenance
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where:** Equipment & Maintenance flows in server.js
- **Exploitation outline:** As Wally (worker), POST approve on your own maintenance request — it is approved.
- **Impact:** Workers can approve their own repair spending, enabling fraudulent service claims.

## Workers & Subsidies

### Worker Self-Promotes to Manager
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where:** Workers & Subsidies flows in server.js
- **Exploitation outline:** As Wally, POST /workers/4/role with role=manager — you are now a manager.
- **Impact:** Any worker can grant themselves manager powers — the keys to approvals, data and payouts.

### Self-Approved Subsidy Application
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where:** Workers & Subsidies flows in server.js
- **Exploitation outline:** As Bob, apply for a subsidy and POST /subsidies/<id>/approve — public money approved by the applicant.
- **Impact:** Applicants can approve their own subsidy claims, diverting support funds fraudulently.

## Admin & Platform

### CSRF on Admin User Deactivation
- **OWASP:** A01:2021 Broken Access Control (CSRF)
- **Difficulty:** Intermediate
- **Where:** Admin & Platform flows in server.js
- **Exploitation outline:** Send the deactivate POST for a user with an admin session but without the hx_origin marker — the account is deactivated.
- **Impact:** An attacker can trick an admin's browser into deactivating accounts, disrupting the whole platform.

### Unauthenticated Debug Endpoint Exposes All Data
- **OWASP:** A05:2021 Security Misconfiguration
- **Difficulty:** Beginner
- **Where:** Admin & Platform flows in server.js
- **Exploitation outline:** GET /api/debug with no login at all — every user, password and order is returned.
- **Impact:** The entire database — including plaintext passwords — is downloadable by anyone, no account needed.
