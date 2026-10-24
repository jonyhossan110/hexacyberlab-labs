# HexaInsuranceClaim (LAB 107) — Vulnerability Map

Every scored test in the lab, grouped by feature. 26 tests across 8 features.

## Login & Authentication

### SQL Injection Login Bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Exploitation outline: Email: ' OR '1'='1' --  with any password logs you in as the first account in the table.
- Impact: On a real insurer portal this means instant takeover of the first account in the database (often an admin), with full access to claims and payouts.

### Brute Force — No Login Throttling
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Exploitation outline: There is no lockout, no CAPTCHA and no delay: the 10th wrong password is answered exactly like the 1st.
- Impact: Attackers can grind through common passwords against customer and staff accounts, leading to claim fraud and data breaches.

### Account Enumeration via Login & Reset Responses
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Exploitation outline: Existing account + wrong password says "Incorrect password"; unknown email says "No account with that email" — a perfect oracle for harvesting valid accounts.
- Impact: Attackers first harvest the valid customer/staff email list, then focus password attacks and phishing only on real accounts.

### Published Demo / Default Admin Credentials
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Exploitation outline: Log in with the published admin demo credentials shown on the login page.
- Impact: Anyone on the internet can sign in as administrator and read or approve every claim in the business.

### Predictable Password Reset Token
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Exploitation outline: Token format: HIC<id>-<id*137+42>. Compute it for any user id — it works even when no reset was ever requested.
- Impact: An attacker who knows a victim's user id can reset their password and take over the account, then file or approve fraudulent claims.

### Role Cookie Tampering (hx_role)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: Set your hx_role cookie to "adjuster" or "admin" and reload /adjuster or /admin.
- Impact: Any customer can crown themselves adjuster or admin by editing a cookie, approving their own claims and reading the whole book of business.

## Registration & Profile

### Weak Password Policy at Registration
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Exploitation outline: A 1-character password is accepted and the account works immediately.
- Impact: Customers pick trivially guessable passwords, making credential attacks against claim accounts cheap and reliable.

### Mass Assignment — Role Granted at Registration
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: POST /register with an extra field role=adjuster (or admin) and the new account is created with that role.
- Impact: Attackers mint their own adjuster/admin accounts, bypassing every hiring and vetting control the insurer has.

### Stored XSS in Display Name
- OWASP: A03:2021 Injection (XSS)
- Difficulty: Beginner
- Exploitation outline: A name like <script>alert(1)</script> is stored and rendered raw in the admin user list.
- Impact: A malicious customer name can run script in an adjuster's or admin's browser, hijacking their session and the claims they control.

### CSRF on Profile Update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: The update is applied with no marker check at all — a cross-site form could do the same in a victim's browser.
- Impact: Attackers can silently change a victim's profile details (including contact email) to prepare account takeover or divert claim communications.

## Claims

### Claim IDOR — Read Another Policyholder's Claim
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: No ownership check is done — any logged-in policyholder can read any claim, including amounts and descriptions.
- Impact: Competitors, fraudsters or curious strangers can read customers' accident, health and damage details — a serious privacy breach.

### Claim Amount Inflation Beyond Coverage Limit
- OWASP: A04:2021 Insecure Design
- Difficulty: Intermediate
- Exploitation outline: Amounts above the coverage limit are saved without complaint — the policy terms say payouts must stay within the limit.
- Impact: Fraudulent customers inflate claims beyond their coverage, converting a $10,000 policy into unlimited payouts.

### Edit Another Policyholder's Claim
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: The update is saved even though you do not own the claim.
- Impact: Attackers can sabotage other customers' claims, alter amounts, or plant misleading descriptions that derail legitimate payouts.

### Claim Status Forgery via Edit Form
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: POST /claim/<id>/update with status=approved flips your own claim to approved without any adjuster.
- Impact: Customers approve their own claims, short-circuiting fraud review and triggering payouts the business never authorised.

## Adjuster & Approvals

### Approval Endpoint Missing Role Check
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: Any logged-in user can approve any claim: the endpoint never verifies the adjuster role.
- Impact: Policyholders approve their own (possibly fraudulent) claims and set the stage for payout — the core anti-fraud control is absent.

### Payout Set Above the Claimed Amount
- OWASP: A04:2021 Insecure Design
- Difficulty: Intermediate
- Exploitation outline: The payout is stored unchecked — approve a $2,500 claim with payout=999999 and it sticks.
- Impact: A rogue or tricked adjuster session can authorise payouts many times the claimed amount, directly draining the insurer.

### Internal Adjuster Notes Leaked to Policyholder
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: The internal SIU note is rendered on the customer-facing claim page — it was only ever meant for staff.
- Impact: Suspected fraudsters learn they are under investigation and why, letting them destroy evidence or adjust their story.

## Evidence & Documents

### Unrestricted Evidence Upload (Stored HTML)
- OWASP: A03:2021 Injection (File Upload)
- Difficulty: Intermediate
- Exploitation outline: The file is stored and served back as text/html from the portal domain — a stored XSS page on the insurer's own site.
- Impact: Attackers host phishing/script pages on the insurer's trusted domain and send them to customers or staff.

### Evidence Download IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: No ownership check: any logged-in user can download any evidence file by guessing its id.
- Impact: Private evidence (medical bills, photos, invoices) of every customer can be harvested by any account holder.

### Path Traversal in Document Download
- OWASP: A01:2021 Broken Access Control (Path Traversal)
- Difficulty: Intermediate
- Exploitation outline: /download?file=../server.js serves the application's own source code.
- Impact: Attackers read source code, configuration and any file the server can reach, staging deeper compromise.

## Payouts

### Double Payout — No Idempotency on Release
- OWASP: A04:2021 Insecure Design
- Difficulty: Advanced
- Exploitation outline: Every call creates a fresh payout: the same claim can be paid again and again, exceeding the approved amount.
- Impact: Insiders or attackers with endpoint access drain multiples of every approved claim — direct financial loss.

### Payout Record IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: Payout amounts and claim links of other customers are served without any ownership check.
- Impact: Attackers map who got paid and how much, enabling targeted fraud, extortion and social engineering.

## Search

### SQL Injection in Claim Search
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- Exploitation outline: Search for ' OR '1'='1' --  and the hidden internal investigation claim appears in the results.
- Impact: Attackers dump the entire claims database, including internal fraud investigations, through the public search box.

### Reflected XSS in Search Results
- OWASP: A03:2021 Injection (XSS)
- Difficulty: Beginner
- Exploitation outline: Your term is reflected unescaped — <script>alert(1)</script> lands raw in the page.
- Impact: Crafted search links run script in victims' browsers, enabling session theft against customers and staff.

## Admin & Platform

### CSRF on Admin User Deactivation
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: The account is deactivated with no CSRF token check — a malicious page could fire this from an admin's browser.
- Impact: An admin visiting a booby-trapped page could silently deactivate staff/customer accounts, disrupting the whole operation.

### Unauthenticated Debug Endpoint Data Dump
- OWASP: A05:2021 Security Misconfiguration
- Difficulty: Beginner
- Exploitation outline: It returns every user (with passwords), policy and claim as JSON — no authentication required.
- Impact: The entire customer database — credentials included — is one unauthenticated request away from any attacker.
