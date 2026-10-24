# HexaAgent — Vulnerabilities (LAB 35)

The complete map of this lab: 26 scored tests across 6 features. Every flaw below is a real, working vulnerability in the app, detected server-side when the exploit actually succeeds.

## Login & Authentication (6)

### SQL injection login bypass (legacy SSO login)
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Intermediate
- **Where:** the Login & Authentication surface of HexaAgent.
- **Exploitation outline:** A classic always-true condition in the email field logs you in without a password.
- **Impact:** On a client platform this means full account takeover — an attacker logs in as any user, including admins, without knowing any password.

### Brute force — no rate limiting or lockout
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Where:** the Login & Authentication surface of HexaAgent.
- **Exploitation outline:** There is no lockout, delay or CAPTCHA — automated guessing just works.
- **Impact:** Client accounts fall to password guessing and credential stuffing; weak passwords are only a matter of time.

### User enumeration via login responses
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Where:** the Login & Authentication surface of HexaAgent.
- **Exploitation outline:** Any difference (text, timing, code) lets an attacker build a valid-email list.
- **Impact:** Attackers harvest the client’s real customer emails and aim phishing and credential stuffing precisely.

### Weak default demo credentials
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Where:** the Login & Authentication surface of HexaAgent.
- **Exploitation outline:** Try demo@hexaagent.local with the most predictable password imaginable.
- **Impact:** An attacker signs in through a forgotten demo account and starts from inside the client’s platform.

### Predictable password-reset token
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Where:** the Login & Authentication surface of HexaAgent.
- **Exploitation outline:** Compute rst-<id>-<current hour epoch> for the victim and reset their password.
- **Impact:** Anyone can reset any client user’s password — including the owner’s — just by knowing their email.

### Role cookie tampering (hx_role)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Login & Authentication surface of HexaAgent.
- **Exploitation outline:** Set hx_role to the highest role and visit the admin area.
- **Impact:** Any ordinary user becomes an admin by editing a cookie — full control of the client platform and its data.

## Registration & Profile (4)

### Weak password policy on registration
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Where:** the Registration & Profile surface of HexaAgent.
- **Exploitation outline:** No length or complexity rule is enforced anywhere.
- **Impact:** Client user accounts protected by trivial passwords fall to the simplest guessing attacks.

### Mass assignment — role set at registration
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Registration & Profile surface of HexaAgent.
- **Exploitation outline:** Submitting role=admin with your registration creates an admin account.
- **Impact:** Anyone can register as an administrator — instant, total compromise of the client’s platform.

### Stored XSS in display name
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Where:** the Registration & Profile surface of HexaAgent.
- **Exploitation outline:** An admin viewing the user list executes your payload in their browser.
- **Impact:** Attackers hijack admin sessions and act inside the client’s platform with full privileges.

### CSRF on profile update (no anti-CSRF marker)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Registration & Profile surface of HexaAgent.
- **Exploitation outline:** The change is applied anyway: any site can edit a logged-in user’s profile.
- **Impact:** Attackers silently change victim profiles — names, emails — paving the way to account takeover.

## Agents & Sharing (5)

### Private agent exposed by IDOR (read)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Where:** the Agents & Sharing surface of HexaAgent.
- **Exploitation outline:** No ownership check stands between you and their private agent page.
- **Impact:** Competitors and attackers read clients’ private AI agents — their instructions, configuration and data.

### Agent instructions leaked via API
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Agents & Sharing surface of HexaAgent.
- **Exploitation outline:** The JSON includes the full confidential instructions the UI hides.
- **Impact:** The client’s proprietary agent instructions — internal rules, codes, mailboxes — leak to any signed-in user.

### Edit or delete another user’s agent (IDOR write)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Agents & Sharing surface of HexaAgent.
- **Exploitation outline:** The change saves, and even deletion succeeds, without any ownership check.
- **Impact:** Attackers sabotage or delete clients’ production agents — downtime and data loss from one guessed id.

### Predictable share-token enumeration
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Agents & Sharing surface of HexaAgent.
- **Exploitation outline:** Walk shr-1, shr-2, shr-3... and harvest every shared agent.
- **Impact:** Every "shared" agent on the client platform is effectively public to anyone who can count.

### Reflected XSS in agent search
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Where:** the Agents & Sharing surface of HexaAgent.
- **Exploitation outline:** It comes back unescaped and executes in the browser.
- **Impact:** Attackers send staff a poisoned search link and run script in the client platform as that staff member.

## Tools & Permissions (4)

### Tool permission escalation by non-owner
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Tools & Permissions surface of HexaAgent.
- **Exploitation outline:** Raise someone else’s harmless read tool to high-risk.
- **Impact:** Attackers arm tools inside client workspaces, turning safe automations into dangerous ones.

### Tool configuration tampering by non-owner
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Tools & Permissions surface of HexaAgent.
- **Exploitation outline:** The endpoint saves it without asking who you are to that agent.
- **Impact:** Attackers repoint client tools at malicious or internal endpoints, redirecting data flows.

### High-risk tool runs without admin approval
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Advanced
- **Where:** the Tools & Permissions surface of HexaAgent.
- **Exploitation outline:** Run Alice’s unapproved Send Email tool and watch it execute.
- **Impact:** Unreviewed high-risk actions — outbound email, payments — run freely, enabling spam, fraud and data loss in the client’s name.

### SSRF via simulated web-fetch tool (internal URL)
- **OWASP:** A10:2021 – Server-Side Request Forgery
- **Difficulty:** Intermediate
- **Where:** the Tools & Permissions surface of HexaAgent.
- **Exploitation outline:** The run log returns internal-only content — the server fetched its own internals.
- **Impact:** Attackers reach internal admin panels and metadata services through the client’s own server.

## Task Runs (4)

### Another user’s run and log exposed (IDOR)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Where:** the Task Runs surface of HexaAgent.
- **Exploitation outline:** Their full task and log — including tool output — are served to you.
- **Impact:** One client’s prompts, data and results leak to every other user of the platform.

### Run log accessible without authentication
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Where:** the Task Runs surface of HexaAgent.
- **Exploitation outline:** It returns the complete log JSON to anonymous visitors.
- **Impact:** Anyone on the internet can read client run logs — prompts, outputs and internal details — with no account.

### Direct prompt injection — system prompt disclosure
- **OWASP:** LLM01:2025 – Prompt Injection
- **Difficulty:** Intermediate
- **Where:** the Task Runs surface of HexaAgent.
- **Exploitation outline:** The run log dutifully includes the confidential instructions.
- **Impact:** Attackers extract the client’s proprietary prompts, internal rules and embedded secrets from their AI agents.

### Indirect prompt injection via knowledge-base document
- **OWASP:** LLM01:2025 – Prompt Injection
- **Difficulty:** Advanced
- **Where:** the Task Runs surface of HexaAgent.
- **Exploitation outline:** Run a partner-integration task with the KB tool and watch the agent obey the document.
- **Impact:** A single poisoned document in the client’s knowledge base makes their agent leak its instructions (or worse) on demand.

## Admin & Platform (3)

### State-changing admin action over GET (CSRF)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Admin & Platform surface of HexaAgent.
- **Exploitation outline:** Any page an admin views can fire that link and delete a user.
- **Impact:** An attacker tricks the client’s admin into deleting users just by getting them to view a page.

### Unauthenticated /debug data exposure
- **OWASP:** A05:2021 – Security Misconfiguration
- **Difficulty:** Beginner
- **Where:** the Admin & Platform surface of HexaAgent.
- **Exploitation outline:** It dumps users, API keys and platform internals as JSON.
- **Impact:** Attackers download the client’s user list and live API keys — a complete platform compromise in one request.

### Predictable API key derived from email
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Where:** the Admin & Platform surface of HexaAgent.
- **Exploitation outline:** Build hx_ + base64(email) for any user and call /api/agents with it.
- **Impact:** Anyone who knows a client user’s email can impersonate their API access completely.
