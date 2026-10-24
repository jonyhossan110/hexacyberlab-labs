# HexaPharma — Vulnerability Map (LAB 63)

The complete map of the lab: **26 scored tests across 8 features**. Every entry is a real, working flaw in the app; a test passes only when the exploit actually succeeds (detected server-side).

## Login & Authentication

### SQL injection login bypass
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Impact:** On a real pharmacy site this is full account takeover: an attacker logs in as any patient and sees their prescriptions, orders and addresses.
- **Report title:** SQL Injection in Login Form Allows Authentication Bypass (Critical)
- **Remediation:** Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.

### Brute force — no rate limit or lockout
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Impact:** Attackers can credential-stuff or brute-force patient accounts at full speed, harvesting medical purchase histories at scale.
- **Report title:** No Rate Limiting or Account Lockout on Login (High)
- **Remediation:** Add progressive rate limiting, account lockout and breached-password checks to the login endpoint.

### User enumeration via login & forgot-password
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Impact:** Enumerated patient emails feed targeted phishing ("your prescription is ready") and credential-stuffing lists.
- **Report title:** Account Enumeration via Differential Authentication Responses (Medium)
- **Remediation:** Return one generic response for all login and password-reset requests, regardless of whether the account exists.

### Published demo credentials
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Impact:** Anyone on the internet can sign in with the published demo account and explore the patient experience — and probe for more.
- **Report title:** Demo Account Credentials Published on the Login Page (High)
- **Remediation:** Remove demo accounts and any credential hints from production; seed test data only in non-production environments.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Impact:** An attacker resets any patient’s password using only their sequential account id, then reads prescriptions and reorders medication.
- **Report title:** Password Reset Tokens Are Predictable (Derived from User ID) (High)
- **Remediation:** Generate reset tokens from a CSPRNG (at least 128 bits), store only a hash, and expire them quickly.

### Session/role cookie tampering
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Impact:** Any patient can promote themselves to pharmacist in their browser and approve prescriptions — the core safety control of the pharmacy collapses.
- **Report title:** Role Stored in a Client Cookie and Trusted for Authorization (Critical)
- **Remediation:** Keep roles exclusively in server-side session records and ignore client-supplied role claims.

## Registration & Profile

### Weak password policy (1 character accepted)
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Impact:** Patients who pick weak passwords get no pushback, so a large share of accounts fall to trivial guessing.
- **Report title:** Registration Accepts Single-Character Passwords (Medium)
- **Remediation:** Enforce a minimum password length (12+ recommended) and screen against known-breached passwords.

### Mass assignment — role / store credit via extra fields
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Impact:** Self-service privilege escalation: a patient makes themselves staff, or mints store credit and orders for free.
- **Report title:** Mass Assignment Allows Role and Balance Manipulation (High)
- **Remediation:** Whitelist the exact fields each endpoint may update; never bind request bodies directly to user records.

### Stored XSS in display name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Impact:** A malicious patient name executes script in the pharmacist’s or admin’s browser, enabling session theft and actions in their name.
- **Report title:** Stored Cross-Site Scripting via Display Name (High)
- **Remediation:** Contextually encode all user-supplied output and validate names against an allowlist character set.

### CSRF on profile update
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Impact:** A malicious page silently changes a patient’s email or delivery details, redirecting medication and enabling takeover.
- **Report title:** Missing CSRF Protection on Profile Update (Medium)
- **Remediation:** Issue per-session anti-CSRF tokens and verify them on every state-changing request.

## Catalog & Search

### SQL injection in catalog search
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Impact:** Attackers dump the full product/inventory database, including internal-only items and stock data meant to stay private.
- **Report title:** SQL Injection in Product Search Exposes Unlisted Inventory (High)
- **Remediation:** Parameterise search queries and enforce visibility rules (listed items only) in the data layer.

### Reflected XSS in search
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Impact:** Attackers send patients crafted search links that run script in the pharmacy origin — stealing sessions or faking payment pages.
- **Report title:** Reflected Cross-Site Scripting in Search Results (Medium)
- **Remediation:** HTML-encode all reflected user input and add a restrictive Content-Security-Policy.

## Prescriptions & Files

### Prescription approved without a pharmacist
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Impact:** Patients self-approve prescriptions for controlled medication — the pharmacy’s central safety and legal control is bypassed entirely.
- **Report title:** Missing Authorization on Prescription Approval Endpoint (Critical)
- **Remediation:** Enforce pharmacist role checks server-side on every verification action and log all decisions.

### Prescription queue exposed to customers via API
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Impact:** Every patient’s prescription details (who takes what) leak to any registered account — highly sensitive health data.
- **Report title:** Broken Access Control: Prescription Queue API Available to All Customers (High)
- **Remediation:** Apply role-based authorization to API endpoints equivalent to the UI, and scope results to the caller.

### Prescription file IDOR — other patients’ documents
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Impact:** An attacker downloads every patient’s prescription documents, exposing diagnoses and medication histories.
- **Report title:** Insecure Direct Object Reference on Prescription Files (High)
- **Remediation:** Check object ownership on every file request and use unguessable file identifiers.

### Unrestricted upload — HTML served from the pharmacy origin
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Impact:** Attackers host phishing/script pages under the pharmacy’s own domain — the perfect lure for patients and staff.
- **Report title:** Unrestricted File Upload with HTML Served Inline (High)
- **Remediation:** Allowlist file types, verify content, store uploads outside the web root and serve with Content-Disposition: attachment.

### Path traversal on document download
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Impact:** Source code, configuration and secrets on the server are readable by any patient account — a stepping stone to full compromise.
- **Report title:** Path Traversal in Document Download (High)
- **Remediation:** Resolve the requested path, verify it stays within the allowed directory, and allowlist downloadable files.

## Cart & Checkout

### Quantity tampering — negative / absurd quantities accepted
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **Impact:** Negative quantities reduce the bill (or generate credit); absurd quantities can drain stock and break fulfilment.
- **Report title:** Missing Server-Side Validation of Cart Quantities (Medium)
- **Remediation:** Validate quantities server-side against sane per-product limits before any price calculation.

### Price tampering at checkout
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **Impact:** Customers name their own price for medication — direct revenue loss on every order.
- **Report title:** Client-Supplied Prices Trusted at Checkout (High)
- **Remediation:** Ignore client prices; recompute all totals from server-side catalogue data at checkout.

### Prescription-only medicine ordered without a verified prescription
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Impact:** Controlled medication ships to anyone who ticks a hidden box — patient-safety and regulatory consequences are severe.
- **Report title:** Prescription Verification Bypass via Client-Supplied Flag (Critical)
- **Remediation:** Verify prescription status server-side against the prescription record for that patient and product before accepting an order.

## Orders & Refills

### Order IDOR — other patients’ orders
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Impact:** Full order histories of all patients — medicines, quantities, addresses — are readable by any account.
- **Report title:** Insecure Direct Object Reference on Order Details (High)
- **Remediation:** Scope order queries to the authenticated owner (or staff roles) on every request.

### Early refill — refill date check bypassed by client flag
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Impact:** Patients stockpile controlled medication by refilling early — a safety and abuse risk the refill interval exists to prevent.
- **Report title:** Refill Interval Check Bypass via Client Flag (High)
- **Remediation:** Compute refill eligibility server-side from the stored next-refill date; ignore client assertions.

## Admin Panel

### Admin panel open to any signed-in user
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Impact:** The full user list — every patient account — is visible to any registered user, a mass privacy breach in one click.
- **Report title:** Broken Access Control on Admin Console (High)
- **Remediation:** Enforce admin-role authorization in middleware for all /admin routes.

### CSRF on admin user deactivation (GET action)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Impact:** An attacker page silently deactivates patient or staff accounts whenever an admin browses it — denial of service against the business.
- **Report title:** State-Changing Admin Action Performed via GET Without CSRF Token (Medium)
- **Remediation:** Use POST with verified anti-CSRF tokens for all state changes, especially administrative actions.

## Platform & API

### Forgeable API token (base64 of email)
- **OWASP:** A02:2021 Cryptographic Failures
- **Difficulty:** Intermediate
- **Impact:** Anyone can impersonate any patient to the API and pull their order data — no password needed, ever.
- **Report title:** API Tokens Predictable (Derived from Email Address) (High)
- **Remediation:** Issue random, high-entropy API tokens, store them hashed, and support revocation.

### Unauthenticated debug endpoint dumps all users
- **OWASP:** A05:2021 Security Misconfiguration
- **Difficulty:** Beginner
- **Impact:** Complete credential dump for every patient and staff account — instant total compromise of the platform.
- **Report title:** Unauthenticated Debug Endpoint Exposes All User Credentials (Critical)
- **Remediation:** Remove debug endpoints from production builds and gate diagnostics behind admin auth and network restrictions.
