# HexaPodcast — Vulnerabilities (LAB 85)

The complete map of the lab: all 26 scored tests grouped by feature. Every entry is a real, working flaw in the app, detected server-side when the exploit succeeds.

## Login & Authentication

### SQL injection login bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Report title: SQL Injection in Login Form Allows Authentication Bypass (Critical)
- Impact: On a real podcast platform this hands an attacker the admin account with no password at all — every show, payout and listener account is exposed.
- Lesson: String-built queries let attacker input change the query logic itself; parameterised queries keep data and code separate.

### Brute force — no rate limit or lockout
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Report title: Missing Rate Limiting on Login Allows Unlimited Password Guessing (High)
- Impact: Attackers can grind through common passwords against creator accounts and take over shows and their payout details.
- Lesson: Without throttling or lockout, password guessing is free and unlimited; the defence is rate limiting, lockout and MFA.

### User enumeration via forgot-password
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Report title: Account Enumeration via Differential Forgot-Password Responses (Medium)
- Impact: Attackers learn exactly which creators and listeners have accounts, focusing phishing and password attacks where they will land.
- Lesson: Different responses for real vs fake accounts let attackers build a target list before attacking; responses must be identical.

### Published demo credentials
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Report title: Live Credentials Published on the Login Page (Medium)
- Impact: Anyone on the internet can walk into a real account, and demo accounts are a classic stepping stone to deeper access.
- Lesson: Credentials printed in the UI are credentials for everyone; demo accounts must never share the production login or hold real access.

### Predictable password-reset token
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Report title: Predictable Password Reset Token Enables Account Takeover (High)
- Impact: An attacker can reset any creator’s password — including payout and show ownership — without touching their inbox.
- Lesson: Reset tokens must be long, random and single-use; anything derivable from public data is an account-takeover shortcut.

### Role cookie tampering
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Report title: Client-Side Role Cookie Trusted for Authorisation (High)
- Impact: A free listener can promote themselves to admin in seconds and reach the full admin panel.
- Lesson: Anything stored on the client can be changed by the client; authorisation decisions must be made server-side from server-side data.

## Registration & Profile

### Weak password policy at registration
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Report title: No Minimum Password Policy on Registration (Medium)
- Impact: Listeners choose trivial passwords, making credential stuffing and guessing attacks far more effective.
- Lesson: Password policy is enforced (or not) at the server; a missing policy guarantees weak passwords across the user base.

### Mass assignment — role / premium via registration fields
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Report title: Mass Assignment in Registration Allows Role and Plan Escalation (High)
- Impact: Attackers mint their own creator or premium accounts for free, skipping payment and vetting entirely.
- Lesson: Binding request bodies directly to data models exposes every writable field; allow-list the fields a form may set.

### Stored XSS in display name
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Report title: Stored Cross-Site Scripting via Display Name (High)
- Impact: An attacker’s script runs in other listeners’ and admins’ browsers — session theft and forced actions follow.
- Lesson: Stored user input must be output-encoded everywhere it is rendered; one unescaped field poisons every page that shows it.

### CSRF on profile update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Report title: Missing CSRF Validation on Profile Update (Medium)
- Impact: A malicious page a listener visits can silently rewrite their profile — the first step in social-engineering and account confusion attacks.
- Lesson: State-changing forms need an unguessable anti-CSRF token that the server verifies on every request.

## Search & Discovery

### SQL injection in search leaks unlisted content
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- Report title: SQL Injection in Search Exposes Unlisted Shows and Episodes (High)
- Impact: Unreleased episodes and draft shows leak before launch, destroying exclusivity and sponsor deals.
- Lesson: Injection flaws leak whatever the query can reach — including content that was never meant to be listed.

### Reflected XSS in search results
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Report title: Reflected Cross-Site Scripting in Search (Medium)
- Impact: Crafted search links run scripts in victims’ browsers when shared — a ready-made phishing amplifier.
- Lesson: Reflected input must be encoded in the response; a search box is one of the most reliable XSS delivery points.

### Unlisted episode reachable by direct ID (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Report title: Missing Visibility Check Allows Direct Access to Unlisted Episodes (Medium)
- Impact: Unreleased content can be downloaded and leaked by anyone who guesses a number.
- Lesson: Unlisted is not private: if the server serves the object by ID without an ownership/visibility check, anyone can fetch it.

## Episodes & Premium

### Premium episode stream served to free listeners
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Report title: Premium Content Stream Missing Entitlement Check (High)
- Impact: The entire premium catalogue can be consumed (and re-shared) without paying — the platform’s core revenue leaks.
- Lesson: Paywalls must be enforced on the resource endpoint itself, not just hidden in the UI.

### Edit another creator’s episode (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Report title: Missing Ownership Check on Episode Edit (IDOR) (High)
- Impact: Rival creators can vandalise or hijack each other’s episodes, titles and release schedules.
- Lesson: Role checks are not ownership checks; every object mutation must verify the caller owns the object.

## Subscriptions & Payments

### Subscription price tampering
- OWASP: A04:2021 Insecure Design
- Difficulty: Beginner
- Report title: Client-Supplied Price Trusted for Premium Subscription (High)
- Impact: Every listener can self-upgrade to Premium for $0 — subscription revenue drops to whatever honest users feel like paying.
- Lesson: Prices live on the server; any price, total or discount arriving from the client is a suggestion, not a fact.

### Another user’s subscription details (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Report title: Broken Access Control on Subscription Records (IDOR) (Medium)
- Impact: Payment metadata of every subscriber is exposed, enabling targeted phishing and social engineering.
- Lesson: Billing objects need the same ownership checks as any private data; sequential ids make guessing trivial.

## Comments & Ratings

### Stored XSS in episode comments
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Report title: Stored Cross-Site Scripting in Episode Comments (High)
- Impact: One comment can attack every listener who opens a popular episode — including the show’s own creator.
- Lesson: Comment fields are stored-XSS classics: sanitise/encode on output, every time, for every viewer.

### Rating value tampering (stars out of range)
- OWASP: A04:2021 Insecure Design
- Difficulty: Beginner
- Report title: Missing Range Validation on Episode Ratings (Medium)
- Impact: A single tampered rating can rocket a show to the top of the charts or bury a competitor.
- Lesson: Server-side range validation is mandatory for every numeric input; UI limits are decoration.

## Creator Analytics & Payouts

### Another creator’s analytics (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Report title: Broken Access Control on Creator Analytics (IDOR) (Medium)
- Impact: Competitors learn exactly what every show earns and how it performs — intelligence creators guard closely.
- Lesson: Business metrics are private data; analytics endpoints need the same ownership checks as content endpoints.

### Payout amount exceeds earnings
- OWASP: A04:2021 Insecure Design
- Difficulty: Intermediate
- Report title: Payout Created Without Balance Verification (Critical)
- Impact: Creators can drain money they never earned — direct financial loss to the platform.
- Lesson: Financial actions must verify balances server-side at the moment of the transaction.

### Another creator’s payout record (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Report title: Broken Access Control on Payout Records (IDOR) (Medium)
- Impact: Payout details leak across creators, enabling invoice and bank-detail fraud.
- Lesson: Financial records must be owner-scoped; a bank reference plus amount is enough to attempt payment fraud.

## Admin Panel

### Admin panel served when role cookie is absent
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Report title: Admin Authorisation Fails Open When Role Cookie Is Missing (High)
- Impact: Any signed-in user who drops one cookie reaches the full admin panel and its user list.
- Lesson: Authorisation must fail closed: a missing signal is a denial, never a default grant.

### CSRF on admin episode-hide action
- OWASP: A01:2021 Broken Access Control
- Difficulty: Advanced
- Report title: Missing CSRF Validation on Admin Content Actions (Medium)
- Impact: A booby-trapped page visited by an admin can hide episodes and disrupt the catalogue without their knowledge.
- Lesson: Privileged actions are the highest-value CSRF targets and need verified tokens most of all.

## Platform & API

### Weak API token — base64 of email
- OWASP: A02:2021 Cryptographic Failures
- Difficulty: Intermediate
- Report title: API Token Is a Deterministic Encoding of the User’s Email (High)
- Impact: Anyone who knows a listener’s email — public by design — owns their API identity.
- Lesson: API tokens must be unguessable random secrets; an encoding of public data is not a credential.

### Unauthenticated /api/debug dumps all accounts
- OWASP: A05:2021 Security Misconfiguration
- Difficulty: Beginner
- Report title: Unauthenticated Debug Endpoint Exposes All User Credentials (Critical)
- Impact: Full credential dump of every user including the admin: total platform compromise in one request.
- Lesson: Debug and diagnostic endpoints must never ship to production — they bypass every other control at once.
