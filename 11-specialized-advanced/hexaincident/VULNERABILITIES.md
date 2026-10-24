# HexaIncident — Vulnerability Map (LAB 110)

Every scored test in the lab, grouped by feature. 26 tests across 9 features. This is the lab's complete map.

## Login & Authentication

### SQL injection login bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Impact: On a real client site this means anyone can sign in as an administrator without knowing a single password — full account takeover in seconds.
- Report title: SQL Injection in Login Form Allows Authentication Bypass (Critical)

### Brute force: no rate limit or lockout
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Impact: Attackers routinely crack client accounts this way; the client only finds out after data is taken or the account is abused.
- Report title: Missing Brute-Force Protection on Login (High)

### User enumeration via response differences
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Impact: Enumeration turns random password spraying into a focused attack on accounts the client actually has, including staff and admins.
- Report title: Account Enumeration via Authentication Error Messages (Medium)

### Published demo credentials grant real access
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Impact: Anyone on the internet can walk into the client platform with credentials the client themselves published.
- Report title: Active Demo Account with Published Credentials (High)

### Predictable password-reset token
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Impact: An attacker who can predict reset tokens can take over any account — including the incident commander’s — during a live incident.
- Report title: Predictable Password Reset Tokens (High)

### Role cookie tampering into the admin panel
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Any low-privilege user can promote themselves to administrator just by editing a cookie — complete platform compromise.
- Report title: Client-Side Role Cookie Trusted for Admin Access (Critical)

## Registration & Profile

### Weak password policy (1 character accepted)
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Impact: Client accounts with trivial passwords are harvested in bulk during credential attacks.
- Report title: No Minimum Password Strength Policy (Medium)

### Mass assignment: self-register as admin
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Self-service admin creation defeats every other control: the attacker simply becomes the most powerful user.
- Report title: Mass Assignment Allows Privilege Escalation at Registration (Critical)

### Stored XSS in display name
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Impact: Stored XSS on an internal platform lets an attacker act as whoever views the page — including administrators — stealing sessions and issuing actions in their name.
- Report title: Stored Cross-Site Scripting via Display Name (High)

### CSRF on profile update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: An attacker page can silently rewrite a responder’s profile — changing the recovery email is a classic path to account takeover.
- Report title: Missing CSRF Protection on Profile Update (Medium)

## Search & Discovery

### Search SQL injection dumps restricted incidents
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- Impact: The client’s most sensitive incident — a confidential compromise investigation — leaks to any user with a search box.
- Report title: SQL Injection in Incident Search Exposes Restricted Records (Critical)

### Reflected XSS in search results
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Impact: A crafted search link sent to a responder runs script in their session — a reliable phishing-to-takeover bridge.
- Report title: Reflected Cross-Site Scripting in Search (Medium)

## Incident Reports

### Restricted incident readable by another team (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: During a real breach, the confidential investigation record — scope, affected systems, evidence — is readable by anyone with any account.
- Report title: Insecure Direct Object Reference on Restricted Incidents (High)

### Editing another responder’s incident
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: An insider or compromised account can falsify another team’s incident record — rewriting what happened during an investigation.
- Report title: Missing Authorization on Incident Edit (High)

### Severity changed by a viewer account
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Downgrading a critical incident delays response while the real attack continues — sabotage with a single request.
- Report title: Unauthorized Severity Modification (High)

### Closing an incident assigned to someone else
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Prematurely closed incidents stop investigations cold; the client believes a threat is handled while it is not.
- Report title: Unauthorized Incident Closure (High)

## Assignments & Workflow

### Reassigning another team’s incident to yourself
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Evidence and responsibility can be quietly pulled away from the right team mid-investigation.
- Report title: Unauthorized Incident Reassignment (Medium)

### Self-assigning a restricted incident
- OWASP: A01:2021 Broken Access Control
- Difficulty: Advanced
- Impact: Confidentiality of the most sensitive investigation collapses — the attacker legitimises their own access.
- Report title: Self-Assignment to Restricted Incident Grants Access (High)

### Escalation triggered by an unauthorized user
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: False escalations burn out the response team and cry wolf; real P1s then get ignored — or a real one is "escalated away" to hide it.
- Report title: Unauthorized Incident Escalation (Medium)

## Evidence & Attachments

### Evidence file download IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Forensic evidence from the most sensitive case can be pulled by any account — leaking investigation details and possibly tipping off the attacker.
- Report title: Evidence Download Missing Object Authorization (High)

### Path traversal in evidence download
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Source code, configuration and potentially secrets on the server become downloadable — the foothold for the next, bigger attack.
- Report title: Path Traversal in File Download (High)

## Audit Trail & Postmortems

### Audit trail readable by any user
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: An attacker with a low account can watch the defenders’ every move and learn exactly what has been noticed about them.
- Report title: Audit Trail Exposed to All Authenticated Users (Medium)

### Postmortem readable across teams (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Postmortems describe exactly how the client was breached and what was weak — a roadmap for the next attacker if leaked.
- Report title: Insecure Direct Object Reference on Postmortems (Medium)

## Admin Panel

### Admin user dump served to any account
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: The entire credential list of the response team — including the admin’s password — is one request away for any account holder.
- Report title: Broken Access Control on Admin User Export (Plaintext Passwords) (Critical)

### CSRF on admin user deactivation
- OWASP: A01:2021 Broken Access Control
- Difficulty: Advanced
- Impact: Tricking one admin into opening a malicious page during an incident could deactivate the responders mid-response.
- Report title: Missing CSRF Protection on Admin Deactivation (High)

## Platform & API

### Unauthenticated /api/debug full data dump
- OWASP: A05:2021 Security Misconfiguration
- Difficulty: Beginner
- Impact: No account, no password, no problem: the whole platform’s data is public to the internet.
- Report title: Unauthenticated Debug Endpoint Exposes All Data (Critical)
