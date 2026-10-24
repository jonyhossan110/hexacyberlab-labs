# HexaCloud — Vulnerability Map (LAB 23)

The complete scored test registry for LAB 23: **26 tests across 9 features**. Every test below is a real, working vulnerability in the app, detected server-side when the exploit succeeds. Keys are never documented here — see README.md for how the key chain works.

## Login & Authentication

### SQL Injection — Login Bypass
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** Use email: ' OR '1'='1' -- with any password. The query matches the first user row and lets you in as them.
- **Impact:** On a real client console this is a full account takeover of the first account in the table — usually an administrator — with no password at all.

### No Rate Limiting — Brute-Force Login
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** Script 10+ wrong-password logins for dev@acme.cloud; the attempt that is still calmly processed proves the missing throttle.
- **Impact:** Attackers can grind through password lists against real staff accounts until one works — a top cause of cloud console breaches.

### User Enumeration via Login & Reset Responses
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login, POST /forgot
- **Exploitation outline:** Submit a login for root@globex.cloud with a wrong password, then one for nobody@nowhere.cloud; when both response types have been observed, enumeration is proven.
- **Impact:** Attackers confirm which employee emails are real accounts, then focus password attacks and phishing only on those.

### Weak / Default Demo Credentials
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Location:** Seeded account demo@acme.cloud
- **Exploitation outline:** Log in as demo@acme.cloud with password demo123.
- **Impact:** A forgotten demo login gives an attacker a genuine foothold inside the client’s cloud account from day one.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Intermediate
- **Location:** POST /forgot, POST /reset
- **Exploitation outline:** Token = rst_<userId>_<sum of the email’s character codes × 31 mod 100000>. Compute it for admin@acme.cloud (id 1) and POST /reset WITHOUT requesting one first.
- **Impact:** Anyone who knows a staff email can mint a valid reset token and take over the account — including the owner’s.

### Client-Side Role Cookie Trusted for Authorization
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** hx_role cookie -> GET /admin
- **Exploitation outline:** Log in as viewer@acme.cloud, change the hx_role cookie value to owner, then visit /admin.
- **Impact:** The lowest-privilege user becomes an administrator by editing one cookie — full console compromise.

## Registration & Profile

### Mass Assignment — Role & Tenant Injection at Registration
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Location:** POST /register
- **Exploitation outline:** POST /register with extra fields role=owner and tenantId=2; your new account is created as an owner inside the other tenant.
- **Impact:** Anyone on the internet can register themselves as an owner inside a customer’s tenant — instant insider access.

### Weak Password Policy at Registration
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /register
- **Exploitation outline:** Register a new account with a 1–3 character password; its acceptance proves the missing policy.
- **Impact:** Customer accounts protected by 3-character passwords fall to guessing in seconds.

### Stored XSS in Display Name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** POST /profile (rendered in header + /admin)
- **Exploitation outline:** Set your profile display name to <script>alert(1)</script> (or an <svg onload> payload) and save; it is stored and served raw.
- **Impact:** An attacker plants script that runs in an administrator’s browser — session theft and actions performed as the admin.

### CSRF on Profile Update
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /profile
- **Exploitation outline:** While logged in, POST /profile from a foreign Origin (e.g. Origin: https://evil.example) with a new display name; the change is accepted.
- **Impact:** A malicious page a staff member visits can silently change their profile — the classic first step to stored-XSS delivery to admins.

## Resources

### Cross-Tenant Resource IDOR
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /resources/:id
- **Exploitation outline:** Log in on the Acme tenant and open /resources/104 — a Globex server — by guessing its id.
- **Impact:** One customer can read every other customer’s servers, databases and configurations — a multi-tenant data breach.

### Unauthorized Resource Actions (Stop / Terminate / Resize)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /resources/:id/action
- **Exploitation outline:** As viewer@acme.cloud, POST action=terminate (or a resize with an absurd size) for a Globex resource id such as 104.
- **Impact:** A read-only user — or a rival tenant — can terminate production servers and resize resources, causing outage and surprise bills.

## Storage Buckets

### Private Bucket Made Public Without Authorization
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /buckets/:id/visibility, GET /public/bucket/:id
- **Exploitation outline:** As any Acme user, set bucket 203 (Globex) to public — or make your own tenant’s private bucket public — then open /public/bucket/203 in a logged-out request.
- **Impact:** Private backups and customer files become downloadable by the whole internet — the classic cloud storage breach headline.

### Path Traversal in Bucket File Download
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /buckets/:id/files/:name
- **Exploitation outline:** Request /buckets/201/files/..%2fserver-config (or ../ sequences) and the app happily reads outside the bucket.
- **Impact:** Attackers step out of the bucket and read application configuration and secrets stored on the server.

## IAM & Policies

### IAM Privilege Escalation — Unrestricted Role Assignment
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /iam/role
- **Exploitation outline:** As viewer@acme.cloud, POST /iam/role with userId=3 (yourself) and role=owner — then check your new powers.
- **Impact:** The least-privileged account promotes itself to owner — total tenant takeover from a single request.

### Cross-Tenant IAM Policy Disclosure (IDOR)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /iam/policies/:id
- **Exploitation outline:** While on the Acme tenant, open /iam/policies/403 — Globex’s admin policy.
- **Impact:** Rivals learn the exact permission layout of another tenant, making targeted privilege-escalation attacks far easier.

## Billing & Plans

### Billing Credit Manipulation
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Location:** POST /billing/credit
- **Exploitation outline:** POST /billing/credit with amount=5000 (or a negative amount) and watch the tenant balance obey.
- **Impact:** Customers erase their bills or run up fraudulent credit — direct revenue loss for the provider.

### Plan Change Without Payment Verification
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **Location:** POST /billing/plan
- **Exploitation outline:** From the Acme tenant (Pro plan) POST /billing/plan with plan=Enterprise; the upgrade applies immediately, free.
- **Impact:** Every customer upgrades to the top tier for free — the pricing model collapses.

### Cross-Tenant Invoice Access (IDOR)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /billing/invoice/:tenantId
- **Exploitation outline:** As an Acme user, open /billing/invoice/2 to read Globex’s invoice.
- **Impact:** Competitors read each other’s invoices — pricing, usage and customer scale leak to rivals.

## Search & Discovery

### SQL Injection in Resource Search
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Location:** GET /search?q=
- **Exploitation outline:** Search for: ' OR '1'='1 — results suddenly include the other tenant’s resources.
- **Impact:** Attackers dump the entire multi-tenant resource catalogue through one search field.

### Reflected XSS in Search
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** GET /search?q=
- **Exploitation outline:** Search for <script>alert(1)</script> and view the page source: your payload is reflected raw.
- **Impact:** Attackers send staff a crafted search link that runs script in their browser under the console’s origin.

## API & Integrations

### API Broken Object-Level Authorization (BOLA)
- **OWASP:** A01:2021 / API1:2023 BOLA
- **Difficulty:** Intermediate
- **Location:** GET /api/resources/:id
- **Exploitation outline:** Call GET /api/resources/104 with YOUR Acme API key; Globex’s server comes back as JSON.
- **Impact:** Any API customer can enumerate and read every tenant’s infrastructure through the official API.

### Predictable API Key Derivation
- **OWASP:** A07:2021 / API2:2023 Broken Authentication
- **Difficulty:** Advanced
- **Location:** GET /api/resources (derived-key fallback)
- **Exploitation outline:** The fallback key is 'hx_' + base64(email). Compute it for root@globex.cloud and call /api/resources with NO session — you are answered as Globex.
- **Impact:** Anyone who knows a customer’s email can forge their API key and act as that tenant programmatically.

## Platform & Admin

### SSRF to the Simulated Instance Metadata Service
- **OWASP:** A10:2021 SSRF
- **Difficulty:** Advanced
- **Location:** GET /metadata?url=
- **Exploitation outline:** Ask the tool for http://169.254.169.254/latest/meta-data/iam-credentials and read the simulated credentials it returns.
- **Impact:** Attackers steal the cloud credentials of the server itself — the keys to the whole cloud account.

### Sensitive Data Exposure via /debug
- **OWASP:** A05:2021 Security Misconfiguration
- **Difficulty:** Beginner
- **Location:** GET /debug
- **Exploitation outline:** While logged in, open /debug and read the other tenant’s API keys and internal settings.
- **Impact:** One page hands attackers every tenant’s API keys and internal configuration — game over in a single request.

### CSRF on Admin User-Disable Action
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /admin/users/:id/disable
- **Exploitation outline:** While holding an admin-capable session, POST the disable action with Origin: https://evil.example; the user is disabled anyway.
- **Impact:** An attacker page visited by an admin disables customer accounts — sabotage performed with the admin’s own session.
