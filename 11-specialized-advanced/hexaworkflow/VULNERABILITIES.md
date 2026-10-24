# HexaWorkflow (LAB 109) — Vulnerability Map

All 26 scored tests, grouped by feature. Every item is a real, working flaw in this training app.

## Login & Authentication

### SQL injection login bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Impact: On a real client site this is a full account takeover — the attacker logs in as the first account in the table, usually the administrator, without knowing any password.
- Report title: SQL Injection in Login Form Allows Authentication Bypass (Critical)

### Brute force — no rate limit or lockout
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Impact: Attackers can grind through password lists against your client's real users; one reused or weak password hands them a legitimate account.
- Report title: Missing Rate Limiting on Login Allows Brute Force Attacks (High)

### User enumeration via differing error messages
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Impact: Attackers harvest a verified list of your client's users, then aim phishing and password spraying only at accounts that definitely exist.
- Report title: User Enumeration via Authentication Error Messages (Medium)

### Demo credentials published on the login page
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Impact: Anyone on the internet can walk into your client's product with the published demo login and explore from inside a real account.
- Report title: Publicly Documented Demo Account Credentials (High)

### Predictable password-reset token
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Impact: An attacker resets the password of any user — including admins — knowing only their email, and takes over the account completely.
- Report title: Predictable Password Reset Tokens Allow Account Takeover (Critical)

### Role taken from a client cookie (session/role tampering)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Any logged-in user becomes an administrator by editing a cookie — full control of your client's users, plans and data.
- Report title: Authorization Role Trusted from Client-Side Cookie (Critical)

## Registration & Profile

### Weak password policy (1 character accepted)
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Impact: Users protect real business data with passwords like "1", and attackers guess them in seconds.
- Report title: Weak Password Policy Allows Single-Character Passwords (Medium)

### Mass assignment — role/plan set at registration
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Attackers self-register as administrators or premium customers of your client — privilege escalation and free paid service in one request.
- Report title: Mass Assignment in Registration Allows Privilege Escalation (High)

### Stored XSS in display name
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Impact: An attacker plants a script in their profile name; when your client's admin opens the user list, the script runs with the admin's session.
- Report title: Stored Cross-Site Scripting via Display Name (High)

### CSRF on profile update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: A malicious page visited by your client's user silently rewrites their profile — the first step in account-takeover and social-engineering chains.
- Report title: Missing CSRF Protection on Profile Update (Medium)

## Workflows

### Cross-workspace workflow IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: Competitors and ex-contractors read your client's automation logic, internal URLs and business processes across tenant boundaries.
- Report title: Insecure Direct Object Reference on Workflow Detail (Cross-Tenant) (High)

### Private workflow served to non-owners
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: The most sensitive automation in the account — payroll export — is readable by any user who guesses its id.
- Report title: Private Workflow Accessible by Direct URL (High)

### Run or toggle another workspace's workflow
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: An attacker triggers or disables your client's business automations — stopping invoice reminders or firing off exports at will.
- Report title: Missing Authorization on Workflow Execute/Toggle Endpoints (High)

### Workflow export leaks full configuration cross-workspace
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Attackers download complete automation blueprints — internal endpoints, recipients and logic — for every tenant on the platform.
- Report title: Cross-Tenant Workflow Export Without Authorization (High)

### SQL injection in workflow search
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- Impact: One search dumps your client's entire cross-tenant catalogue, turning a limited IDOR into full platform enumeration.
- Report title: SQL Injection in Workflow Search (High)

### Reflected XSS in workflow search
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Impact: A crafted search link sent to your client's admin runs script in their browser and can steal the session or act as them.
- Report title: Reflected Cross-Site Scripting in Search (Medium)

## Runs & History

### Run-log IDOR exposes another workspace's execution output
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Attackers read exactly what your client's automations exported and where it went — a map of the business's data flows.
- Report title: Insecure Direct Object Reference on Run History (Medium)

## Templates

### Use another user's private template
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Private playbooks — pricing logic, internal endpoints — are copied out of your client's account by any other user.
- Report title: Private Template Reuse Without Ownership Check (Medium)

## Integrations & API Keys

### Integrations page exposes teammates' API keys
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: Any insider (or anyone who hijacks one low-privilege account) harvests every teammate's API key and acts under their identities.
- Report title: Exposure of Other Users' API Keys on Integrations Page (High)

### Rotate another user's API key
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: An attacker rotates a victim's API key to break their automations (denial of service) or races to use the fresh key first.
- Report title: Missing Authorization on API Key Rotation (High)

### Server-side request forgery via webhook tester
- OWASP: A10:2021 Server-Side Request Forgery
- Difficulty: Advanced
- Impact: Attackers reach cloud metadata and internal services through your client's server — the classic route to full cloud account compromise.
- Report title: Server-Side Request Forgery in Webhook Test Feature (Critical)

### API accepts base64(email) as a credential
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Impact: Anyone who knows a user's email address — public information — gets full API access to their workflows.
- Report title: Weak API Authentication Accepts Base64-Encoded Email (Critical)

## Workspaces & Members

### Member promotes roles — workspace role escalation
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: The lowest-privilege member of your client's workspace promotes themselves to owner and can remove the real owner.
- Report title: Privilege Escalation via Workspace Role Endpoint (High)

## Admin Panel

### Admin panel open to non-admin sessions
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: Full administrative control — every user, every plan — is one cookie edit away for any registered user.
- Report title: Broken Access Control on Admin Panel (Critical)

### CSRF on admin plan change
- OWASP: A01:2021 Broken Access Control
- Difficulty: Advanced
- Impact: A booby-trapped page an admin merely visits can rewrite customer plans across your client's whole platform.
- Report title: Missing CSRF Protection on Administrative Actions (High)

## Platform & API

### Unauthenticated debug endpoint dumps all data
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: The entire platform database — credentials included — is downloadable by anyone, no account needed. Total compromise in one request.
- Report title: Unauthenticated Debug Endpoint Exposes Full Database Dump (Critical)
