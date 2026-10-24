# HexaDevHub — Vulnerability Map (LAB 22)

All 25 scored tests, grouped by feature. Each entry is a real, working vulnerability in the app — the test completes only when the exploit's effect actually happens on the server.

## Login & Authentication (6)

### SQL injection login bypass
- **OWASP:** A03:2021 – Injection · **Difficulty:** Beginner
- **Where:** the Login & Authentication surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** An attacker logs in as any account — including an admin — without knowing a password, taking over projects and their live API tokens.
- **Report:** "SQL Injection in Login (Authentication Bypass)" — Severity Critical. Fix: Use parameterised queries / prepared statements for the login lookup; never concatenate user input into SQL.

### Brute force — no rate limiting or lockout
- **OWASP:** A07:2021 – Identification and Authentication Failures · **Difficulty:** Beginner
- **Where:** the Login & Authentication surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** Attackers guess weak passwords at full speed until one works — and a developer account hands over every project token inside it.
- **Report:** "Missing Brute-Force Protection on Login" — Severity High. Fix: Add per-account and per-IP rate limiting, progressive delays, and lockout/alerting after repeated failures.

### User enumeration via login & reset responses
- **OWASP:** A07:2021 – Identification and Authentication Failures · **Difficulty:** Beginner
- **Where:** the Login & Authentication surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** Attackers build a verified list of a company’s developer accounts, then focus phishing and password guessing only on real targets.
- **Report:** "Account Enumeration via Differential Responses" — Severity Medium. Fix: Return one generic message ("if that account exists…") for login failures and reset requests.

### Weak default demo credentials
- **OWASP:** A07:2021 – Identification and Authentication Failures · **Difficulty:** Beginner
- **Where:** the Login & Authentication surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** Anyone can walk into a live demo account and explore the portal exactly as a paying customer would see it.
- **Report:** "Default/Demo Credentials Enabled" — Severity High. Fix: Disable seeded demo accounts in production and force unique, strong passwords at first login.

### Predictable password-reset token
- **OWASP:** A07:2021 – Identification and Authentication Failures · **Difficulty:** Intermediate
- **Where:** the Login & Authentication surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** Anyone who knows a developer’s email can reset their password and seize the account — and every project and token inside it.
- **Report:** "Predictable Password Reset Token" — Severity High. Fix: Generate reset tokens from a CSPRNG (at least 128 bits), store them hashed, single-use, with a short expiry.

### Session role trusted from a client cookie (hx_role)
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Login & Authentication surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** Any signed-up user can promote themselves to platform admin by editing a cookie — full control of every customer project.
- **Report:** "Client-Side Role Cookie Trusted for Authorisation (Privilege Escalation)" — Severity Critical. Fix: Store roles only in the server-side session record; never accept role claims from client-controlled cookies.

## Registration & Profile (4)

### Weak password policy (1-character passwords accepted)
- **OWASP:** A07:2021 – Identification and Authentication Failures · **Difficulty:** Beginner
- **Where:** the Registration & Profile surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** Users pick trivially guessable passwords, and with no brute-force protection those accounts fall in seconds.
- **Report:** "Weak Password Policy on Registration" — Severity Medium. Fix: Enforce a minimum length (12+) and block common/breached passwords server-side at registration and reset.

### Mass assignment — role set at registration
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Registration & Profile surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** Anyone can register themselves as a platform admin in one request — no exploit chain needed.
- **Report:** "Mass Assignment Allows Privilege Escalation at Registration" — Severity Critical. Fix: Whitelist the exact fields registration may set; assign roles server-side only.

### Stored XSS in display name (team roster)
- **OWASP:** A03:2021 – Injection · **Difficulty:** Beginner
- **Where:** the Registration & Profile surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** An attacker plants a script in a shared roster that runs in teammates’ browsers — stealing sessions or acting as them.
- **Report:** "Stored Cross-Site Scripting via Display Name" — Severity High. Fix: Output-encode all user data at render time and add a restrictive Content-Security-Policy.

### CSRF on profile update
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Registration & Profile surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** A malicious page a developer visits can silently rewrite their profile (name, email) using their logged-in session.
- **Report:** "Cross-Site Request Forgery on Profile Update" — Severity Medium. Fix: Require per-session anti-CSRF tokens on all state-changing requests and validate Origin/Referer.

## Projects (2)

### Private project readable by any account (IDOR)
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Beginner
- **Where:** the Projects surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** Competitors read other companies’ private project details — the classic IDOR behind real customer-data breaches.
- **Report:** "Broken Object Level Authorisation — Private Project Readable by IDOR" — Severity High. Fix: Check project membership/ownership on every project read and return 404 for non-members.

### Project settings tampered by a non-member (write IDOR)
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Projects surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** An attacker renames a victim project or flips its visibility to public, exposing it to the whole internet.
- **Report:** "Broken Object Level Authorisation — Project Settings Writable by Non-Members" — Severity High. Fix: Enforce ownership/membership checks on all project mutations, server-side.

## API Tokens (4)

### Live API token printed inside public docs quickstart
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Beginner
- **Where:** the API Tokens surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** A company’s production API token sits in public docs — anyone can call their API as them, run up usage and read their data.
- **Report:** "Live API Credential Exposed in Public Documentation" — Severity Critical. Fix: Use placeholder tokens in all examples, scan published docs for secrets, and rotate any token ever printed.

### Read-only token can write (scope not enforced)
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate
- **Where:** the API Tokens surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** A leaked low-privilege read token — the kind pasted into dashboards and CI logs — becomes full write access to the project.
- **Report:** "API Token Scope Not Enforced (Read Token Performs Writes)" — Severity High. Fix: Enforce token scope on every API endpoint (read vs write vs admin) before processing the request.

### Any user can revoke another project’s tokens (IDOR)
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate
- **Where:** the API Tokens surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** An attacker kills a victim company’s production integrations by revoking their tokens — instant denial of service.
- **Report:** "Broken Object Level Authorisation — Token Revocation" — Severity High. Fix: Scope all token operations to projects the caller owns or administers.

### Forgeable legacy API token (derived from public ids)
- **OWASP:** A07:2021 – Identification and Authentication Failures · **Difficulty:** Intermediate
- **Where:** the API Tokens surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** Anyone can mint a working API credential for any project from its public page — total API compromise without stealing anything.
- **Report:** "Forgeable API Token Derived from Public Identifiers" — Severity Critical. Fix: Retire the legacy token format; issue only random tokens of at least 128 bits and store them hashed.

## Documentation (3)

### Stored XSS in documentation page content
- **OWASP:** A03:2021 – Injection · **Difficulty:** Intermediate
- **Where:** the Documentation surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** A project’s public documentation — the most trusted page a company owns — runs attacker scripts in customers’ browsers.
- **Report:** "Stored Cross-Site Scripting in Documentation Pages" — Severity High. Fix: Sanitise stored docs HTML with an allowlist sanitizer and serve docs with a restrictive CSP.

### Documentation of another project editable (IDOR)
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Documentation surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** Attackers deface or poison a company’s public documentation — planting wrong install commands or malicious download links.
- **Report:** "Broken Object Level Authorisation — Docs Page Editing" — Severity High. Fix: Check project membership on every docs write; log content changes with authorship.

### Private project documentation served without login
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Beginner
- **Where:** the Documentation surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** Internal runbooks, endpoints and credential notes of private projects are readable by anyone who guesses a slug.
- **Report:** "Private Documentation Exposed Without Authentication" — Severity High. Fix: Require authentication and project membership for docs of non-public projects.

## Team Invites (3)

### Invite link accepted by the wrong account
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Team Invites surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** A forwarded or leaked invite link hands project access to strangers — a routine cause of insider-style breaches.
- **Report:** "Team Invite Not Bound to Invited Email" — Severity High. Fix: Bind invites to the invited email address and require the accepting account to match it.

### Invite link reusable (never marked used)
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Team Invites surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** A single shared invite link quietly adds attacker accounts to a project over and over.
- **Report:** "Team Invite Replay (Token Never Invalidated)" — Severity Medium. Fix: Mark invites used on acceptance, expire them quickly, and alert owners on each join.

### Invite acceptance lets the guest choose their own role
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Advanced
- **Where:** the Team Invites surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** Anyone with any invite link becomes project OWNER — able to remove the real owners and seize the project.
- **Report:** "Privilege Escalation via Invite Role Override" — Severity Critical. Fix: Grant exactly the role stored on the invite; ignore any role supplied by the client.

## Usage & API (2)

### API returns another project’s stats (BOLA)
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Usage & API surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** One customer reads every other customer’s API usage — volumes, endpoints, growth — competitive and operational intelligence.
- **Report:** "Broken Object Level Authorization in Project Stats API" — Severity High. Fix: Authorise the token’s project against the path project id on every API request.

### Usage dashboard of another project viewable (IDOR)
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Beginner
- **Where:** the Usage & API surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** Rivals watch a company’s traffic patterns and busiest endpoints in real time — and learn which tokens are active.
- **Report:** "Broken Object Level Authorisation — Usage Dashboard" — Severity Medium. Fix: Restrict dashboards to project members and audit access to usage data.

## Platform & Admin (1)

### Debug endpoint dumps users, tokens and config
- **OWASP:** A05:2021 – Security Misconfiguration · **Difficulty:** Beginner
- **Where:** the Platform & Admin surface of HexaDevHub (see PRACTICE-GUIDE.md for the challenge).
- **Impact:** One unauthenticated request hands an attacker every live API token in the portal — instant compromise of all customers.
- **Report:** "Sensitive Data Exposure via Unauthenticated Debug Endpoint" — Severity Critical. Fix: Remove debug endpoints from production builds; require admin auth and redact secrets anywhere diagnostics remain.
