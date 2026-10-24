# HexaRentals — Vulnerability Map (LAB 92)

Every scored test in this lab, grouped by feature. This is the complete map: 26 tests across 9 features. Each flaw is live in the running app and is detected server-side only when the real exploit succeeds.

## Login & Authentication (6)

### SQL Injection Login Bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: POST /login
- Impact: On a real rental platform this means instant takeover of the admin account — every lease, tenant record and bank detail exposed in one request.
- Exploitation outline: Use admin@hexarentals.local' OR '1'='1' -- as the email and any password — the query comments out the password check.

### Brute Force — No Rate Limiting or Lockout
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /login
- Impact: Attackers can grind through common passwords against landlord accounts and walk away with rent payments and tenant personal data.
- Exploitation outline: Send 10+ wrong passwords for alice@test.local in a row; the 10th is still processed normally.

### User Enumeration via Login & Forgot-Password Responses
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /login, POST /forgot
- Impact: A scammer can harvest which landlords and tenants use the platform, then aim phishing and credential-stuffing precisely at them.
- Exploitation outline: Probe at least 5 different emails across login/forgot and note which ones say "No account" vs "Wrong password" / "Reset link sent".

### Published Demo / Default Credentials
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /login
- Impact: Anyone on the internet could sign in as the platform admin using credentials the site itself advertises — total compromise, zero skill required.
- Exploitation outline: Log in with the published admin demo account exactly as shown on the login page.

### Predictable Password-Reset Token
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Location: POST /reset
- Impact: An attacker can reset the password of any landlord and divert incoming rent to themselves, with no access to the victim’s inbox.
- Exploitation outline: Tokens look like RT<userId>-<userId*137+42>. Compute Bob's (id 5) token yourself and POST /reset for bob@test.local WITHOUT ever requesting a reset for him.

### Role Cookie Tampering (hx_role)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: GET /admin with forged cookie
- Impact: Any tenant could promote themselves to admin in their browser and read every user’s password and lease on the platform.
- Exploitation outline: As a tenant, set the hx_role cookie to admin and visit /admin.

## Registration & Profile (4)

### Weak Password Policy (1-Character Passwords)
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /register
- Impact: Tenants who pick one-character passwords can be guessed in seconds, exposing their lease, address and payment history.
- Exploitation outline: Register a new account with the password "x" — it is accepted.

### Mass Assignment — Role & Balance at Registration
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /register
- Impact: A stranger can register as an admin or with a huge wallet balance, then approve their own tenancy and drain deposit refunds.
- Exploitation outline: POST /register with extra fields role=admin (or balance=99999) alongside the normal fields.

### Stored XSS in Display Name
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: POST /register or POST /profile, viewed on /tenants
- Impact: A malicious tenant name could run script in a landlord’s browser, stealing their session and hijacking rent and deposit actions.
- Exploitation outline: Register (or update your profile) with the name <script>alert(1)</script> — it is stored and served raw on the tenant directory.

### CSRF on Profile Update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /profile
- Impact: A landlord visiting a malicious page could have their profile and payout details silently changed by a forged request.
- Exploitation outline: While logged in, POST /profile with a new name and no hx_origin cookie (e.g. curl with only the sid cookie) — the change is accepted.

## Properties & Search (2)

### SQL Injection in Property Search (Unlisted Listing Leak)
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- Location: GET /search?q=
- Impact: Unlisted and internal properties — addresses, rents, ownership — leak to anyone, enabling burglary targeting and competitor snooping.
- Exploitation outline: Search for: ' OR '1'='1 — every property comes back, including the unlisted penthouse that normal search hides.

### Reflected XSS in Search
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: GET /search?q=
- Impact: Attackers can send landlords crafted search links that execute script in their browser and steal the session.
- Exploitation outline: Search for <script>alert(1)</script> — the payload is reflected into the page unescaped.

## Units & Leases (5)

### Unit IDOR — Another Tenant’s Unit & Lease Details
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /unit/:id
- Impact: Tenants can map exactly who lives in which unit, their rent and lease dates — prime material for stalking, scams and social engineering.
- Exploitation outline: As Alice, open /unit/2 — Bob’s unit and lease summary are served to you.

### Lease Document IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /lease/:id
- Impact: Complete lease contracts — names, rents, dates, unit addresses — are readable by any account holder on the platform.
- Exploitation outline: As Alice, open /lease/2 and read Bob’s complete lease terms.

### Broken Access Control — Anyone Can Sign a Lease
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /lease/:id/sign
- Impact: A random user can "sign" binding rental agreements in other people’s names, creating legal chaos and fraudulent tenancies.
- Exploitation outline: As Carol, POST /lease/1/sign — Alice’s lease gets marked signed by you.

### Lease Terms Tampering by Non-Party (Rent Edit IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /lease/:id/edit
- Impact: A malicious user could slash their own rent to $1 — or raise a victim’s — by editing leases they have no connection to.
- Exploitation outline: As Bob, POST /lease/1/edit with rent=1 — Alice’s lease rent is rewritten.

### Unlisted Property Readable by Direct URL
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /property/:id
- Impact: Internal-only listings (staff housing, withheld properties, pricing notes) are exposed to all users by guessing one number.
- Exploitation outline: Open /property/4 directly — the unlisted internal penthouse is served to any logged-in user.

## Rent Payments (3)

### Payment Record IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /payment/:id
- Impact: Rent payment histories reveal income patterns and arrears, enabling targeted scams against both tenants and landlords.
- Exploitation outline: As Alice, open /payment/2 — Bob’s rent payment record is served to you.

### Rent Amount Tampering — Pay $1, Marked Paid in Full
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /payments/pay
- Impact: Tenants can settle a $1,200 rent with $1 while the system reports the month fully paid — direct revenue loss that looks legitimate in the books.
- Exploitation outline: POST /payments/pay for your lease with amount=1 — the payment is recorded as PAID and the lease shows settled.

### Negative Payment Credits the Wallet
- OWASP: A08:2021 Software and Data Integrity Failures
- Difficulty: Intermediate
- Location: POST /payments/pay
- Impact: Users can mint balance out of thin air with negative "payments" and then withdraw or offset real rent against fabricated credit.
- Exploitation outline: POST /payments/pay with amount=-50 — your wallet balance grows by $50 and the payment still counts.

## Deposits (2)

### Deposit Record IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /deposit/:id
- Impact: Attackers learn exactly how much money is held per tenant — a shopping list for refund fraud and phishing.
- Exploitation outline: As Alice, open /deposit/2 — Bob’s deposit record is fully visible.

### Deposit Refund Abuse — Non-Landlord Refunds Any Amount
- OWASP: A01:2021 Broken Access Control
- Difficulty: Advanced
- Location: POST /deposit/:id/refund
- Impact: Any user can trigger refunds of other tenants’ deposits — for more than was ever held — straight out of the landlord’s pocket.
- Exploitation outline: As Bob, POST /deposit/1/refund with amount=5000 — a refund bigger than the deposit itself is recorded.

## Maintenance Requests (2)

### Maintenance Request Privacy IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /request/:id
- Impact: Burglars and scammers gain unit-level intelligence: broken locks, absent tenants, access notes — from a simple id change.
- Exploitation outline: As Alice, open /request/2 — Bob’s maintenance request, with his unit details, is served.

### Tenant Can Close Own Request via Landlord-Only Status Action
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /request/:id/status
- Impact: Tenants can falsely close repair jobs (or landlords’ tenants can sabotage records), breaking maintenance accountability and safety follow-ups.
- Exploitation outline: As Alice, POST /request/1/status with status=completed — your own request closes without the landlord.

## Admin Panel (1)

### CSRF on Admin User Deletion
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /admin/users/:id/delete
- Impact: Tricking the admin into visiting a page could silently delete user accounts — tenants and landlords alike — with the admin’s own session.
- Exploitation outline: As the admin (demo login), POST /admin/users/6/delete with only the sid cookie and no hx_origin marker — the user is deleted.

## Platform & API (1)

### Unauthenticated Debug Endpoint Dumps All Data
- OWASP: A05:2021 Security Misconfiguration
- Difficulty: Beginner
- Location: GET /api/debug
- Impact: One unauthenticated URL hands over the entire platform database — all credentials, leases and payments — no account needed.
- Exploitation outline: Open /api/debug in a fresh browser with no session — every user (with passwords), lease and payment is returned as JSON.
