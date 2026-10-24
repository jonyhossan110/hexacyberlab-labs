# HexaLabTest (LAB 64) — Vulnerabilities

The complete vulnerability map of the lab: 26 scored tests across 9 features. Every entry is a real, working flaw in the app; the /tests mission page tracks them live.

## Login & Authentication (6)

### SQL injection login bypass
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** Use email: ' OR '1'='1' -- with any password — the OR makes the row match and the comment eats the password check.
- **Impact:** On a real lab portal this hands an attacker the first account in the database — usually an admin — with no password at all.

### Brute force — no rate limit or lockout
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** After 10+ failed logins for the same account the app is still happily accepting guesses.
- **Impact:** Patient and doctor accounts on a real portal would fall to automated guessing, exposing medical data.

### User enumeration via login and forgot-password
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login, POST /forgot
- **Exploitation outline:** Probe at least 5 different emails — the responses tell you exactly which accounts exist.
- **Impact:** Attackers harvest valid patient/doctor emails first, then aim phishing and password attacks only at real accounts.

### Default / demo admin credentials still active
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** Sign in as the admin with the published demo password admin123.
- **Impact:** Anyone on the internet could administer a real diagnostic portal with a password printed on its own login page.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Location:** POST /reset
- **Exploitation outline:** Tokens follow LT-<id x 137 + 42>. Compute one for a user who never requested a reset and use it.
- **Impact:** Any patient or doctor account — including admins — can be taken over by arithmetic, no inbox access needed.

### Session role trusted from a client cookie
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** hx_role cookie / GET /admin
- **Exploitation outline:** Set hx_role=admin in your browser, then visit /admin.
- **Impact:** Any logged-in patient becomes an administrator by editing a cookie — full control of a medical platform.

## Registration & Profile (4)

### Weak password policy (1 character accepted)
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /register
- **Exploitation outline:** A one-character password such as "x" is accepted.
- **Impact:** Patients will choose trivial passwords on a real portal and their medical reports become easy pickings.

### Mass assignment — self-assign a staff role
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /register
- **Exploitation outline:** POST /register with role=doctor (or technician/admin) and the account is created with that role.
- **Impact:** Anyone can register as a "doctor" on a real lab platform and read or alter patient results.

### Stored XSS in display name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** POST /register, POST /profile
- **Exploitation outline:** Register (or rename yourself) with a name like <script>alert(1)</script> and it is stored and rendered raw.
- **Impact:** An attacker’s "name" would execute in doctors’ and admins’ browsers, stealing sessions on a real portal.

### CSRF on profile update
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /profile
- **Exploitation outline:** Submit a profile change with no _origin field (e.g. from a cross-site form) and it is accepted.
- **Impact:** A malicious page could silently change a doctor’s or patient’s profile details while they are logged in.

## Test Catalog & Search (2)

### SQL injection in catalog search dumps hidden tests
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Location:** GET /search
- **Exploitation outline:** Search for ' OR '1'='1 and the result set grows beyond the public catalogue — including the internal QA panel.
- **Impact:** On a real platform this leaks internal-only services and is the first step toward dumping the whole database.

### Reflected XSS in catalog search
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** GET /search
- **Exploitation outline:** Search for <script>alert(1)</script> and the payload comes straight back in the page.
- **Impact:** Attackers send victims links to the real lab site that run attacker script in the victim’s session.

## Test Orders (4)

### Price tampering on test orders
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **Location:** POST /orders
- **Exploitation outline:** Order the $55 Thyroid Panel with price_THYROID=1 and the bill becomes $1.
- **Impact:** A real lab would run expensive diagnostics for $1 — direct revenue loss on every order.

### Quantity tampering — negative quantities accepted
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **Location:** POST /orders
- **Exploitation outline:** Submit qty=-2 for a test and the order total goes negative — the lab would owe YOU money.
- **Impact:** Negative totals corrupt billing, accounting and refund flows on a real platform.

### Order IDOR — read another patient’s order
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /orders/:id
- **Exploitation outline:** As Alice, open Bob’s order 1003 or 1004 directly.
- **Impact:** Any patient can browse every other patient’s tests and medical history on a real portal — a serious privacy breach.

### Order status forged at creation (skip the lab workflow)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /orders
- **Exploitation outline:** Create an order with status=Reported and it is born "Reported" — no sample, no lab, no doctor.
- **Impact:** Fraudulent "completed" medical reports could be manufactured without any test ever being performed.

## Sample Tracking (2)

### Patient advances own sample status (missing role check)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /orders/:id/status
- **Exploitation outline:** As a patient, POST /orders/<your id>/status with the next status and it moves.
- **Impact:** Patients could mark their own samples as processed/reported, corrupting lab operations and trust in results.

### Technician work queue visible to patients
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /tech/queue
- **Exploitation outline:** Open it while logged in as a patient — the whole queue, with patient names, is served.
- **Impact:** A real queue leak exposes every patient currently being tested and what they are being tested for.

## Results & Reports (4)

### Patient edits own results via the technician endpoint
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /tech/results
- **Exploitation outline:** As Alice, POST results for your own order 1002 and change a value — it is stored.
- **Impact:** Patients could falsify their own medical results — insurance fraud, unsafe treatment decisions, total loss of trust.

### Report IDOR — download another patient’s report
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /orders/:id/report
- **Exploitation outline:** As Alice, open the report for Bob’s order 1004.
- **Impact:** Complete diagnostic reports of strangers downloadable by any patient — reportable data breach on a real platform.

### Report downloadable before doctor review
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Location:** GET /orders/:id/report
- **Exploitation outline:** Your order 1002 is "Results Ready" but NOT reviewed — its report downloads anyway.
- **Impact:** Patients could act on wrong, unreviewed results — a patient-safety incident, not just a data issue.

### Path traversal in report file download
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /files?name=
- **Exploitation outline:** Request /files?name=../server.js and the application source code is served.
- **Impact:** Source code, configuration and other patients’ files become downloadable — a foothold for deeper attacks.

## Home Collection (2)

### Home-collection booking IDOR — home address leak
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /collection/:id
- **Exploitation outline:** As Alice, open booking 501 — Bob’s home address is shown.
- **Impact:** Leaked home addresses of patients — a physical-safety and privacy incident on a real platform.

### Home-collection fee tampering
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **Location:** POST /collection
- **Exploitation outline:** Book with fee=0 and the collection is free.
- **Impact:** Every home visit’s fee can be zeroed — steady, silent revenue leakage.

## Admin Panel (1)

### CSRF on admin user deactivation
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /admin/deactivate
- **Exploitation outline:** POST /admin/deactivate for some user with no _origin field while signed in as admin.
- **Impact:** An attacker page could deactivate every staff account while an admin browses — operational shutdown.

## Platform & API (1)

### Weak API token — base64(email) unlocks all orders
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Location:** GET /api/orders
- **Exploitation outline:** Send x-api-token = base64 of any user’s email, with no session cookie at all.
- **Impact:** The entire order database of a real lab is one base64 encoding away from anyone who knows a staff email.
