# HexaIdentity — Vulnerability Map (LAB 108)

All 26 scored tests, grouped by feature. This is the lab’s complete map.

## Login & Authentication (6)

### SQL Injection Login Bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: POST /login (email field)
- Exploitation outline: Submit the login form with an email like ' OR '1'='1' -- and any password; the string-built query matches the first account (the admin) without knowing its password.
- Impact: On a real client portal this is a full account takeover of the first matching account — usually an administrator — with no password at all.

### Brute Force — No Login Throttling
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /login
- Exploitation outline: Send 10 or more wrong passwords for one real account; every attempt is processed normally — nothing slows down, locks or challenges you.
- Impact: Attackers can grind through password lists against a real client’s users until one account falls, then pivot from there.

### User Enumeration via Login & Recovery Responses
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /login and POST /forgot
- Exploitation outline: Probe at least 5 different emails across the login and forgot-password forms and compare the messages: real accounts and unknown emails get visibly different answers.
- Impact: Enumeration lets an attacker build a verified target list from a client’s user base, fuelling phishing and credential stuffing.

### Published Demo Admin Credentials
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: GET /login (help text on the page) and POST /login
- Exploitation outline: Read the login page: the demo administrator credentials are printed on it. Sign in with them and you hold a full admin session.
- Impact: A published admin login gives an attacker instant full control of a client’s identity portal, including every user’s identity documents.

### Predictable Password-Reset Token
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Location: POST /reset
- Exploitation outline: Reset tokens follow a formula from the user id: HI<id>-<id×137+42>. Compute it for Bob (id 3) and reset his password without ever requesting an email.
- Impact: Anyone can reset any user’s password — including admins — and take over accounts on a real identity service at scale.

### Role Cookie Tampering (hx_role)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: GET /admin (role read from a client cookie)
- Exploitation outline: Sign in as a normal user, then edit the hx_role cookie to "admin" and open /admin — the portal trusts the role your browser claims.
- Impact: Any ordinary user can promote themselves to administrator and reach the verification queue and user management on a client’s live system.

## Registration & Profile (4)

### Weak Password Policy — 1-Character Passwords Accepted
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /register
- Exploitation outline: Register a new account with a password of a single character; the portal accepts it and creates the account.
- Impact: Weak user passwords on a client identity portal make every other account-takeover technique faster and cheaper.

### Mass Assignment — Role & Verified Status at Registration
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /register
- Exploitation outline: Add extra fields to the registration request — role=admin and status=verified. The portal copies them onto the new account, creating a pre-verified administrator.
- Impact: An attacker can mint verified admin accounts on a client’s identity platform in one request — total compromise without touching the login form.

### Stored XSS in Display Name
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: POST /register (name field, rendered in admin and profile views)
- Exploitation outline: Register with a display name containing a script payload; the name is stored raw and rendered unescaped to other users and admins.
- Impact: Stored XSS in an identity portal can hijack staff sessions, letting an attacker approve their own identity or export user records.

### CSRF on Profile Update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /profile/update
- Exploitation outline: Submit a profile update with no hx_origin marker (as a cross-site form would): the change is accepted, proving no anti-CSRF token protects the endpoint.
- Impact: A malicious page could silently rewrite a victim’s identity profile details on a client portal while they browse.

## Identity Profiles & Documents (3)

### IDOR — Full Identity Record of Another User
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /identity/:id
- Exploitation outline: While signed in as one user, open another user’s identity record by changing the id (e.g. /identity/3): full name, date of birth and identity number are served with no ownership check.
- Impact: An attacker can harvest every customer’s identity number and date of birth from a client portal — prime material for identity fraud.

### Unrestricted Document Upload — HTML Served Back
- OWASP: A08:2021 Software and Data Integrity Failures
- Difficulty: Intermediate
- Location: POST /documents/upload and GET /uploads/:name
- Exploitation outline: Upload a "document" named evil.html containing a script payload; the portal stores it and serves it back as text/html from its own origin.
- Impact: Attackers can host phishing and script payloads under a client’s real domain, defeating user trust and content policies.

### Path Traversal on Document Download
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: GET /download?file=
- Exploitation outline: Ask the document download endpoint for ../server.js: the filename is joined to the documents folder without sanitising, so files outside it are read and returned.
- Impact: Source code, configuration and credential files can leak from a client server, turning one bug into a full compromise.

## Verification Workflow (3)

### Self-Verification Through the Verifier Endpoint
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /verify/approve
- Exploitation outline: The approval endpoint — meant for verification staff — checks only that you are signed in. As a regular user with a pending identity, approve your own record and become "verified" with no review.
- Impact: On a real identity service this defeats KYC entirely — anyone can mark themselves verified and use that trust to defraud others.

### Verification Status Tampering via Client-Supplied Status
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: POST /identity/status
- Exploitation outline: The status endpoint trusts a status value sent by the client. POST status=verified for your own account and the portal records you as verified — no documents, no review.
- Impact: Attackers gain "verified" trust instantly on a client platform, unlocking features and credibility reserved for checked identities.

### Verification Queue Leaks Applicant PII to Regular Users
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /verify/queue
- Exploitation outline: Open the staff verification queue as a regular user: a route-ordering bug serves the page — with every pending applicant’s email, identity number and document — to anyone signed in.
- Impact: Applicants’ identity documents and numbers leak to any registered user — a reportable data breach for a real client.

## Credentials & Badges (2)

### Forged Credential Issuance — Government-Verified Badge
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /credentials/issue
- Exploitation outline: The self-service issuance endpoint is meant to mint only the basic badge, but it accepts any credential type: ask for type=gov-verified and the portal issues you a government-verified credential.
- Impact: Forged "government verified" credentials on a real platform can be used to scam users and partner services that trust the badge.

### Credential IDOR — Another User’s Credential
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /credential/:id
- Exploitation outline: Open another user’s credential by id (e.g. /credential/1): its type, number and owner are shown with no ownership check.
- Impact: Leaked credential numbers let attackers clone or reference real users’ verified credentials in fraud against a client’s partners.

## Linked Services (2)

### Linked Services IDOR — Service Tokens Exposed
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /services/user/:userId
- Exploitation outline: Open /services/user/3 while signed in as someone else: Bob’s linked services are listed together with their secret service tokens.
- Impact: Stolen service tokens let attackers act inside a victim’s linked bank/government services under a client’s identity product.

### Unlink Another User’s Service
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /services/unlink
- Exploitation outline: Submit the unlink action with another user’s link id: the portal removes their linked service without checking that it belongs to you.
- Impact: Attackers can disconnect victims from their linked services — locking them out of banking or government flows tied to a client’s portal.

## Account Recovery (2)

### Password Recovery via Publicly Visible Security Answer
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Location: POST /recover (answer shown on GET /profile/:id)
- Exploitation outline: Recovery asks for the user’s hometown — which the portal prints on the public member profile. Read Bob’s profile, then reset his password through the recovery form.
- Impact: Anyone can reset the password of any user whose profile they can read — silent, complete account takeover on a client service.

### Reset Token Reuse — Tokens Never Invalidate After Use
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Location: POST /forgot then POST /reset twice with the same issued token
- Exploitation outline: Request a reset token for your own account (the simulated email shows it), use it to set a new password — then use the SAME token again to set another. It still works.
- Impact: Anyone who ever sees a reset email — forwarded, leaked, or in a shared inbox — keeps a forever key to that client account.

## Admin Panel (2)

### Admin User Dump Served to Any Logged-In User
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /admin/users.json
- Exploitation outline: As any ordinary signed-in user, open /admin/users.json: the endpoint checks only that a session exists and returns every account — including plaintext passwords.
- Impact: Every user password on a client’s portal leaks to any registered account — instant mass account takeover and credential-stuffing material.

### CSRF on Admin Account Deactivation
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /admin/deactivate
- Exploitation outline: As an admin, submit a deactivation with no hx_origin marker (as a cross-site form would): the account is deactivated, proving the admin action has no CSRF token.
- Impact: A booby-trapped page could deactivate accounts — or worse — using a client admin’s own browser and privileges.

## Platform & API (2)

### Unauthenticated Debug Dump of All Identity Data
- OWASP: A05:2021 Security Misconfiguration
- Difficulty: Beginner
- Location: GET /api/debug (no session)
- Exploitation outline: Open /api/debug in a fresh browser with no login at all: the diagnostic endpoint dumps every user (with passwords), documents, credentials and linked services.
- Impact: A complete identity-database leak — passwords, ID numbers, documents — from a single unauthenticated URL on a client’s system.

### Weak API Token — Base64 of the Email Address
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Location: GET /api/identity?token=
- Exploitation outline: The API accepts a "token" that is simply the base64 of the user’s email. Encode Bob’s email and read his full identity record with no session at all.
- Impact: Anyone who knows or guesses a user’s email can pull their identity record from a client’s API — no password ever needed.
