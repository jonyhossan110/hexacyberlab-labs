# HexaManufacture (LAB 104) — Vulnerability Map

All 26 scored tests, grouped by feature. Every item is a real, working flaw in this local training app — detected server-side when the exploit succeeds.

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03:2021 — Injection
- **Difficulty:** Beginner
- **What it is:** String-built SQL queries let attackers rewrite the query logic and log in without a password.
- **Exploitation outline:** Use admin@hexamanufacture.local' OR '1'='1' -- as the email with any password.
- **Impact:** On a real factory system this hands an attacker the first foothold — often an admin session — without stealing any password.

### No Brute-Force Protection on Login
- **OWASP:** A07:2021 — Authentication Failures
- **Difficulty:** Beginner
- **What it is:** Without throttling, online password guessing is free and unlimited.
- **Exploitation outline:** Submit at least 10 failed logins for operator@hexamanufacture.local; the 10th is still processed normally.
- **Impact:** Attackers can guess weak staff passwords all day; one success can expose production schedules and supplier pricing.

### User Enumeration via Login & Forgot-Password Responses
- **OWASP:** A07:2021 — Authentication Failures
- **Difficulty:** Beginner
- **What it is:** Different error messages for real vs fake accounts hand attackers a verified target list.
- **Exploitation outline:** Probe at least 5 different emails across login/forgot and note which ones are confirmed as real.
- **Impact:** Attackers confirm which staff emails are valid, then aim phishing and password attacks only at real accounts.

### Published Demo / Default Credentials
- **OWASP:** A07:2021 — Authentication Failures
- **Difficulty:** Beginner
- **What it is:** Default and demo credentials left visible are the first thing attackers try.
- **Exploitation outline:** Sign in with the published admin demo credentials.
- **Impact:** Anyone can try the printed admin password; if it works on the real system, the whole plant is exposed.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 — Authentication Failures
- **Difficulty:** Intermediate
- **What it is:** Reset tokens must be unguessable random values; a formula based on the user ID is public knowledge.
- **Exploitation outline:** The token is HM followed by the user id, a dash, and id×137+42. Compute it for a user who never requested a reset and use it.
- **Impact:** Anyone can reset the plant manager’s password knowing only their user ID — full account takeover with no email access.

### Role Cookie Tampering (Client-Side Role Trust)
- **OWASP:** A01:2021 — Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Authorization data must live server-side; a role stored in a client cookie is just a suggestion attackers can rewrite.
- **Exploitation outline:** Set the hx_role cookie to admin and open /admin.
- **Impact:** A floor operator can promote themselves to admin in seconds and reach user management and plant settings.

## Registration & Profile

### Weak Password Policy (1-Character Passwords)
- **OWASP:** A07:2021 — Authentication Failures
- **Difficulty:** Beginner
- **What it is:** Password policy is a server-side control; without it users pick passwords that fall instantly.
- **Exploitation outline:** Register an account with a 1-character password.
- **Impact:** Staff accounts with trivial passwords are guessed in seconds, especially combined with no brute-force protection.

### Mass Assignment — Self-Assign Admin Role at Registration
- **OWASP:** A01:2021 — Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Binding request bodies directly to user records lets attackers set privileged fields the UI never shows.
- **Exploitation outline:** POST /register with an extra role=admin field.
- **Impact:** Anyone can register themselves as an administrator — complete control of users, production data and pricing.

### Stored XSS in Display Name
- **OWASP:** A03:2021 — Injection
- **Difficulty:** Beginner
- **What it is:** Any user-controlled text rendered unescaped becomes stored XSS that fires in other users’ browsers.
- **Exploitation outline:** Register or update your profile with a name containing a script payload.
- **Impact:** A malicious name can steal the session of the admin who opens the user list, compromising the whole system.

### CSRF on Profile Update
- **OWASP:** A01:2021 — Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** State-changing endpoints must verify the request really came from your own site (token or origin check).
- **Exploitation outline:** Submit a profile update POST without the hx_origin marker — it is accepted.
- **Impact:** A booby-trapped page an employee visits can silently change their profile — a classic stepping stone to account misuse.

## Search & Catalogue

### SQL Injection in Search Leaks Confidential Work Orders
- **OWASP:** A03:2021 — Injection
- **Difficulty:** Intermediate
- **What it is:** Every input that reaches a query is an injection surface — search boxes included.
- **Exploitation outline:** Search for ' OR '1'='1' -- and see what confidential rows appear.
- **Impact:** Confidential prototype production runs and internal orders leak to any user, exposing trade secrets to competitors.

### Reflected XSS in Search
- **OWASP:** A03:2021 — Injection
- **Difficulty:** Beginner
- **What it is:** Reflected input must be encoded; a search box that echoes raw HTML is an XSS delivery channel.
- **Exploitation outline:** Search for a script payload and view the page source.
- **Impact:** Attackers send staff a crafted search link that runs script in their session — phishing and session theft follow.

## Work Orders

### Work Order IDOR — View Another Operator’s Work Order
- **OWASP:** A01:2021 — Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Every object access must be checked against the caller’s ownership or role — hiding links is not protection.
- **Exploitation outline:** Open a work order owned by another operator by changing the ID.
- **Impact:** Operators (or an attacker in one account) can read every production order, including quantities and schedules of other lines.

### Work Order Quantity Tampering by Non-Owner
- **OWASP:** A01:2021 — Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Business numbers must be validated and authorized server-side; client-supplied quantities are fiction until checked.
- **Exploitation outline:** POST new planned/produced quantities to another operator’s work order.
- **Impact:** Production figures can be falsified — output overstated, scrap hidden, and planning/inventory decisions poisoned.

### Work Order Completion Without Manager/QC Authority
- **OWASP:** A01:2021 — Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Workflow state transitions are authorization decisions; skipping them breaks quality gates.
- **Exploitation outline:** As an operator, complete a work order that is still in progress.
- **Impact:** Unfinished or failed production can be marked complete, shipping bad product and falsifying delivery records.

### Confidential Internal Work Order Exposed by Direct URL
- **OWASP:** A01:2021 — Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Unlisted is not the same as unauthorized — direct object access must be denied, not just unlinked.
- **Exploitation outline:** Guess the ID after the visible orders and open the internal prototype order directly.
- **Impact:** The secret prototype run — product, quantities, schedule — is readable by any account, a direct trade-secret leak.

## Inventory & Materials

### Stock Adjustment by Non-Manager (Broken Access Control)
- **OWASP:** A01:2021 — Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Sensitive mutations need server-side role checks on the endpoint itself, not just a hidden button.
- **Exploitation outline:** As an operator, POST a stock adjustment to any material.
- **Impact:** Anyone can inflate or erase stock records — theft becomes invisible and production planning collapses.

### Material Issue Drives Stock Negative (Missing Validation)
- **OWASP:** A04:2021 — Insecure Design
- **Difficulty:** Intermediate
- **What it is:** Quantities must be validated against server-side truth; negative stock means the invariant was never enforced.
- **Exploitation outline:** Issue more units of a material than are in stock and watch the stock go below zero.
- **Impact:** The ERP reports phantom inventory; lines stop mid-run and emergency purchases follow — real money lost to a data bug.

### Purchase Order Price Tampering
- **OWASP:** A04:2021 — Insecure Design
- **Difficulty:** Intermediate
- **What it is:** Prices must come from server-side catalogue data; a client-supplied price is an offer, not a fact.
- **Exploitation outline:** Create a purchase order with a unit price far below the catalogue cost.
- **Impact:** Staff or attackers can order materials at invented prices — direct financial loss and corrupted accounting.

## Quality Control

### QC Self-Approval (Inspector Approves Own Check)
- **OWASP:** A01:2021 — Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Separation of duties is a security control: creators must never approve their own work.
- **Exploitation outline:** Approve the quality check that you inspected yourself.
- **Impact:** Failed production can be waved through by the person who made it — defective goods ship under a forged quality stamp.

### QC Result Tampering — Fail Changed to Pass by Operator
- **OWASP:** A01:2021 — Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Quality results are records of truth; write access must be limited to the QC role.
- **Exploitation outline:** As an operator, set the failed QC check’s result to Pass.
- **Impact:** Known-bad batches get a passing record — product recalls, liability and customer harm become a matter of time.

## Maintenance

### Close Another Technician’s Maintenance Ticket
- **OWASP:** A01:2021 — Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Ownership checks apply to actions, not just views; closing work you do not own breaks accountability.
- **Exploitation outline:** Close a maintenance ticket assigned to another technician.
- **Impact:** Safety maintenance can be silently marked done while the machine was never touched — an accident and audit risk.

## Admin Panel

### Admin User List (With Passwords) Open to Any User
- **OWASP:** A01:2021 — Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Admin endpoints must verify role on the server for every request — obscurity is not a control.
- **Exploitation outline:** Open /admin/users while signed in as a non-admin.
- **Impact:** Every staff password is exposed to any account — instant full compromise of the entire ERP.

### CSRF on Admin User Deactivation
- **OWASP:** A01:2021 — Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Privileged actions need CSRF tokens most of all — they are the highest-value forged requests.
- **Exploitation outline:** POST to the deactivate endpoint without the hx_origin marker.
- **Impact:** A malicious page visited by the admin can deactivate accounts, locking staff out of the plant system.

## Platform & API

### Unauthenticated Debug Endpoint Dumps All Data
- **OWASP:** A05:2021 — Security Misconfiguration
- **Difficulty:** Beginner
- **What it is:** Debug endpoints must never ship to production; if they exist, they are unauthenticated data breaches waiting to be found.
- **Exploitation outline:** Fetch /api/debug with no session.
- **Impact:** The entire user table — passwords included — plus production data is downloadable by anyone who guesses one URL.

### API Token Is Just Base64 of the User’s Email
- **OWASP:** A07:2021 — Authentication Failures
- **Difficulty:** Intermediate
- **What it is:** A token that anyone can compute from public data (an email address) is not authentication.
- **Exploitation outline:** Call /api/workorders with X-Api-Token set to the base64 of another user’s email, with no session.
- **Impact:** Knowing any staff email — printed on every quote — grants full API access to their production data with no password.
