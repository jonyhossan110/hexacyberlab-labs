# HexaInsurance (LAB 47) — Vulnerability Map

All 25 scored tests, grouped by feature. Every entry is a real,
working flaw in this application, detected server-side when the exploit
actually succeeds.

## Login & Authentication

### SQL Injection — Login Bypass
- **OWASP:** A03:2021 – Injection · **Difficulty:** Beginner
- **Location:** POST /login (legacy string-built lookup)
- **Exploitation:** Submit the login form with an injection payload such as ' OR '1'='1 in the email field and any password; the bent query returns the first user (the platform admin) and a session is issued.
- **Impact:** On a real insurer portal this means instant takeover of the first account the query returns — usually an administrator — with full access to policyholder data and claims.

### Brute Force — No Login Throttling
- **OWASP:** A07:2021 – Authentication Failures · **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation:** Send 10+ failed login attempts for one account (e.g. bob@test.local) in a row; every attempt is processed normally — no delay, CAPTCHA, or lockout ever appears.
- **Impact:** Attackers can grind through password lists against real policyholder accounts at full speed; any weak password falls, and with it the customer's policies and claims.

### User Enumeration via Login Errors
- **OWASP:** A07:2021 – Authentication Failures · **Difficulty:** Beginner
- **Location:** POST /login (error responses)
- **Exploitation:** Submit a wrong password for an existing email ("Incorrect password.") and for a non-existent email ("No account found for that email.") — the distinguishable responses confirm valid accounts.
- **Impact:** An attacker can harvest a verified list of policyholder emails from the portal itself, then aim phishing and password attacks only at real accounts.

### Default Demo Credentials Still Active
- **OWASP:** A07:2021 – Authentication Failures · **Difficulty:** Beginner
- **Location:** Login page demo note + POST /login
- **Exploitation:** Use the demo credentials printed on the login page (demo@hexainsure.local / demo123) to sign in to a live account.
- **Impact:** Anyone on the internet can walk into a real, working policyholder account, learn the portal's layout from inside, and use it as a launchpad for deeper attacks.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 – Authentication Failures · **Difficulty:** Intermediate
- **Location:** POST /forgot + POST /reset
- **Exploitation:** Compute md5(victim email), take the first 10 hex characters, and submit it as the reset token with a new password — the portal accepts it and changes the password.
- **Impact:** Anyone who knows a policyholder's email address can reset their password and take over the account — no inbox access needed.

### Role Cookie Tampering — Admin Trusts the Browser
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate
- **Location:** GET /admin (hx_role cookie check)
- **Exploitation:** Sign in as a customer, edit the hx_role cookie to "admin", and open /admin — the console trusts the cookie instead of the server-side account role.
- **Impact:** Any policyholder can promote themselves to platform admin by editing a cookie, reaching user management and every customer's records.

## Registration & Profile

### Weak Password Policy — 1-Character Passwords
- **OWASP:** A07:2021 – Authentication Failures · **Difficulty:** Beginner
- **Location:** POST /register
- **Exploitation:** Register a new account with a 1-character password; the account is created without any policy complaint.
- **Impact:** Policyholder accounts protected by one-character passwords fall to the first guessing attempt, exposing personal data, policies, and claim histories.

### Mass Assignment — Self-Assign the Agent Role
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /register (whole-body binding)
- **Exploitation:** Submit the registration form with an extra role=agent field; the server binds it and creates a working agent account.
- **Impact:** Anyone can register themselves as an insurance agent, gaining the claims-review queue and the power to approve or reject real customers' claims.

### Stored XSS in Display Name
- **OWASP:** A03:2021 – Injection · **Difficulty:** Beginner
- **Location:** POST /register + profile name rendering
- **Exploitation:** Create an account whose display name contains a script payload; the payload is stored and rendered unescaped wherever the name appears (header greeting, agent queue, admin list).
- **Impact:** A malicious "customer name" executes script in the browsers of agents and admins who open the claims queue — a direct path to session theft and back-office takeover.

### CSRF on Profile Update
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /profile/update
- **Exploitation:** POST a profile change with the hidden marker field missing (or a cross-site Origin); the server applies the change without verifying the marker.
- **Impact:** A policyholder who visits a malicious page while signed in can have their name, phone, and address silently rewritten — the first step to diverting claim correspondence and payouts.

## Policies & Coverage

### Policy IDOR — Read Any Customer's Policy
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Beginner
- **Location:** GET /policies/:id
- **Exploitation:** As Alice, request /policies/3 (Bob's Home Shield Plus policy); the full policy is served with no ownership check.
- **Impact:** Every policyholder's coverage limits, premiums, and personal details are readable by any other customer — prime material for fraud, social engineering, and competitive theft.

### Coverage Tampering via Mass Assignment
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /policies/:id/update
- **Exploitation:** Submit the policy update with a tampered coverageLimit (or premium); the server binds and stores the attacker-chosen values.
- **Impact:** A policyholder can raise their own coverage from $50,000 to $999,999 (or slash their premium) without paying a cent more — the insurer carries risk it never priced.

### SQL Injection in Policy Search
- **OWASP:** A03:2021 – Injection · **Difficulty:** Intermediate
- **Location:** GET /search?q=
- **Exploitation:** Search with the payload ' OR '1'='1; the bent query returns every customer's policies instead of only your own matches.
- **Impact:** One search can dump every policy in the company — all customers, coverage amounts, and premiums — in a single response.

### Reflected XSS in Policy Search
- **OWASP:** A03:2021 – Injection · **Difficulty:** Beginner
- **Location:** GET /search (query reflection)
- **Exploitation:** Search for a script payload; the results page reflects it unescaped in the "Results for" line, executing in the viewer's browser.
- **Impact:** A crafted search link sent to an agent or admin runs script in their browser under the portal's origin — session theft and actions in their name.

## Claims

### Claim IDOR — Read Any Customer's Claim
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Beginner
- **Location:** GET /claims/:id
- **Exploitation:** As Alice, request /claims/2 (Bob's claim); the full claim detail is served without an ownership check.
- **Impact:** Any customer can read every other customer's claims — what happened, what it cost, and what evidence they filed — a privacy breach and a fraud playbook.

### Claim Amount Above Coverage Limit Accepted
- **OWASP:** A04:2021 – Insecure Design · **Difficulty:** Intermediate
- **Location:** POST /claims
- **Exploitation:** File a claim on your own Auto Protect policy (coverage $20,000) for $50,000; the server stores it without ever checking the coverage limit.
- **Impact:** Inflated claims enter the insurer's pipeline at whatever amount the claimant invents — at scale this is direct claims fraud against reserves.

### Unrestricted Evidence Upload — HTML Served Inline
- **OWASP:** A03:2021 – Injection · **Difficulty:** Intermediate
- **Location:** POST /claims/:id/evidence + GET /evidence/:id
- **Exploitation:** Upload an evidence file with an .html name and a script payload; opening its download link serves it as text/html, executing under the portal origin.
- **Impact:** Attack pages live on the insurer's real domain: a "claim evidence" link sent to staff executes script as the trusted portal — phishing and session theft with a genuine URL.

### Evidence Download IDOR — Other Customers' Files
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Beginner
- **Location:** GET /evidence/:id
- **Exploitation:** As Alice, request /evidence/2; Bob's claim evidence is downloaded with no ownership check.
- **Impact:** Invoices, photos, and receipts from every claim are downloadable by any signed-in customer — raw personal and financial documents, perfect for identity theft.

## Renewals & Billing

### Renewal Premium Manipulation — Pay $1 Instead of $340
- **OWASP:** A04:2021 – Insecure Design · **Difficulty:** Intermediate
- **Location:** POST /policies/:id/renew
- **Exploitation:** Submit the renewal for your own policy with the premium field tampered from $340 to $1; the policy renews at the attacker-chosen price.
- **Impact:** Every customer can renew at $1: the insurer keeps providing full coverage while the premium income that funds claims evaporates.

### Renew Another Customer's Policy (Action IDOR)
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /policies/:id/renew
- **Exploitation:** As Alice, submit a renewal for Bob's policy (id 3); the state change is applied to another customer's policy.
- **Impact:** Attackers can renew, alter the billing state of, and create confusion around other customers' policies — support chaos, billing disputes, and a foothold for refund fraud.

## Agent Portal

### Agent Claims Queue Visible to Any Policyholder
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Beginner
- **Location:** GET /agent
- **Exploitation:** Open /agent while signed in as a plain customer; the agent claims queue renders with all customers' claims and personal details.
- **Impact:** The entire claims operation — every customer, incident, and amount under review — is visible to any policyholder, including the fraudsters the queue exists to catch.

### Claim Decision by Non-Agent — Approve Your Own Claim
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /agent/claims/:id/decide
- **Exploitation:** As a customer, POST decision=approved for your own under-review claim; the claim status changes with no agent involved.
- **Impact:** Policyholders can approve their own claims — including inflated ones — converting the portal into a self-service payout machine.

## Admin Panel

### Admin User Deactivation via GET (CSRF)
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate
- **Location:** GET /admin/users/:id/deactivate
- **Exploitation:** Trigger the deactivation URL as the admin (a bare GET, no token); the target account is disabled immediately.
- **Impact:** One malicious link or image in an email can make the admin deactivate any account — customers locked out, or a staffer's account killed mid-incident.

## Platform & API

### Unauthenticated API Dumps Every Policyholder
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Beginner
- **Location:** GET /api/policyholders
- **Exploitation:** Request /api/policyholders with no session at all; the JSON response lists every user with contact details and their policies.
- **Impact:** The entire customer book — names, emails, phone numbers, and policy summaries — is downloadable by anyone on the internet: a reportable data breach in one request.

### Missing Security Headers
- **OWASP:** A05:2021 – Security Misconfiguration · **Difficulty:** Beginner
- **Location:** All responses (observed on GET /dashboard)
- **Exploitation:** Load any portal page and inspect the response headers: no CSP, X-Frame-Options, or X-Content-Type-Options is set anywhere.
- **Impact:** Without framing and content-type protections, the portal can be embedded in attacker pages for clickjacking against policyholders and staff.

