# HexaTranslate — Vulnerability Map (25 scored tests, 9 features)

Every entry below is a real, working flaw in this app, detected server-side at the
moment the exploit's effect actually happens. Grouped by feature.


## Login & Authentication (5)

### SQL Injection login bypass
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner · **Severity (report):** Critical
- **What it teaches:** String-built queries let attacker input change the meaning of the query itself — here it turns a login form into an admin session.
- **Client impact:** On a real client site this is a full account takeover of the most privileged account, reached from the public login page in seconds.
- **Report title:** SQL Injection in authentication allows login bypass
- **Remediation:** Use parameterised queries everywhere and never build SQL by concatenating user input.
- **Exploitation outline:** POST /login with email = admin@hexatranslate.local' -- and ANY password. The lookup matches the admin row and the password check is skipped.

### Brute force — no rate limit or lockout on login
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner · **Severity (report):** High
- **What it teaches:** Without throttling, an attacker can try unlimited passwords against any account until one works.
- **Client impact:** A client's customer accounts fall to password-spraying and credential-stuffing lists — one weak password is all it takes.
- **Report title:** Missing brute-force protection on login
- **Remediation:** Add rate limiting, progressive delays and lockout/alerting after repeated failures per account and IP.
- **Exploitation outline:** POST /login 10 times with a wrong password for marco@hexatranslate.local; the 10th failure is still processed normally.

### User enumeration via login & password-reset responses
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner · **Severity (report):** Medium
- **What it teaches:** Different responses for "no such account" and "wrong password" hand attackers a free list of valid accounts to target.
- **Client impact:** Attackers harvest your client's real customer emails, then aim phishing and credential stuffing exactly at them.
- **Report title:** Account enumeration through differing authentication responses
- **Remediation:** Return one generic message ("invalid credentials" / "if the account exists…") for every failure case.
- **Exploitation outline:** POST /forgot or /login once with a real email (lena@hexatranslate.local) and once with a fake one (nobody@nowhere.test): one says "No account found", the other complains about the password or issues a reset.

### Weak & default credentials on live accounts
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner · **Severity (report):** High
- **What it teaches:** Default and dictionary passwords survive into production more often than any exotic bug — and they are the first thing an attacker tries.
- **Client impact:** Anyone on the internet can walk into a real customer's account with a password from a public top-10 list.
- **Report title:** Accounts with default / weak passwords
- **Remediation:** Force password changes for seeded accounts, block known-breached passwords and enforce a real password policy.
- **Exploitation outline:** Log in as demo@demo.local / password, or tara@hexatranslate.local / LetMeIn123 — both are accepted.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Intermediate · **Severity (report):** Critical
- **What it teaches:** A reset token must be unguessable — if it is derived from a public value like the user id, the reset flow becomes an account-takeover flow.
- **Client impact:** An attacker resets the password of any customer — including admins — without ever seeing an email.
- **Report title:** Predictable password reset tokens allow account takeover
- **Remediation:** Generate reset tokens from a CSPRNG (≥128 bits), store them hashed, single-use, with a short expiry.
- **Exploitation outline:** POST /forgot for any account, read the token (rst-<user id>), then POST /reset with token rst-4 to take over a DIFFERENT account's password.


## Account & Profile (4)

### Weak password policy at registration
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner · **Severity (report):** Medium
- **What it teaches:** If the server accepts any password, users will pick terrible ones — policy must be enforced server-side.
- **Client impact:** Your client's users end up with one-character passwords that fall to the first automated guess.
- **Report title:** No minimum password strength enforced at registration
- **Remediation:** Enforce a minimum length (≥10) and breached-password screening on the server.
- **Exploitation outline:** POST /register with password = "a" — the account is created and you are logged in.

### Mass assignment at registration (plan / credits / role)
- **OWASP:** A08:2021 Software & Data Integrity Failures · **Difficulty:** Intermediate · **Severity (report):** High
- **What it teaches:** Binding request data straight onto a model lets attackers set fields the UI never offered — pricing tiers, balances, even roles.
- **Client impact:** Attackers give themselves the paid Enterprise plan and a huge credit balance for free — direct revenue loss for the client.
- **Report title:** Mass assignment allows privilege and billing manipulation
- **Remediation:** Whitelist assignable fields explicitly on every endpoint; never bind raw request bodies to models.
- **Exploitation outline:** POST /register with extra fields plan=Enterprise&credits=99999 (or role=admin) — your profile shows them applied.

### Stored XSS in profile display name
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner · **Severity (report):** High
- **What it teaches:** Any user-controlled string rendered without output encoding becomes stored XSS that fires for everyone who views it.
- **Client impact:** An attacker plants script on your client's site that runs in other customers' browsers — session theft, defacement, phishing overlays.
- **Report title:** Stored cross-site scripting via profile display name
- **Remediation:** Contextually encode all user output and add a Content-Security-Policy header.
- **Exploitation outline:** Register or update your profile with name = <script>alert(1)</script> (or an <img onerror> payload), then open /profile.

### CSRF on profile update
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** Medium
- **What it teaches:** State-changing endpoints without an anti-CSRF token can be triggered by any website the victim visits while logged in.
- **Client impact:** A malicious page silently rewrites your client's customers' profiles — names, details, even contact data — in one visit.
- **Report title:** Missing CSRF protection on profile update
- **Remediation:** Require a per-session anti-CSRF token on every state-changing form and verify Origin/Referer.
- **Exploitation outline:** While logged in, POST /profile from a raw HTTP client (no hx_token field) with a new name — the change is applied.


## Translation Projects (3)

### Project IDOR — read another user's project
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** High
- **What it teaches:** Checking that a user is logged in is not authorisation — every object access must verify the object belongs to them (or their role allows it).
- **Client impact:** Competitors and strangers read your client's customers' confidential documents queued for translation — contracts, legal texts, product plans.
- **Report title:** Insecure direct object reference on translation projects
- **Remediation:** Enforce per-object ownership/role checks on every project read.
- **Exploitation outline:** Log in as marco@hexatranslate.local and open /project?id=103 — Omar's project is served in full.

### Export another user's project (data exfiltration)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** High
- **What it teaches:** Export/download endpoints are the highest-value IDOR targets because they package the data for exfiltration.
- **Client impact:** Bulk theft of your client's customers' translation projects — a reportable data breach, not just a privacy bug.
- **Report title:** Project export endpoint lacks authorisation checks
- **Remediation:** Apply the same ownership checks on export endpoints as on the UI, and log bulk exports.
- **Exploitation outline:** As any user, GET /project/export?id=103 — the full project record downloads as JSON.

### Delete another user's project by id
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** High
- **What it teaches:** Destructive actions need the strictest authorisation checks; a missing check turns a read bug into data destruction.
- **Client impact:** An attacker deletes your client's customers' work — lost projects, broken deadlines, support chaos.
- **Report title:** Missing authorisation on project deletion
- **Remediation:** Verify ownership (or an admin role) before any destructive operation, and soft-delete with audit logs.
- **Exploitation outline:** POST /project/delete with id=101 while logged in as a different user — Lena's project is gone.


## Translation Memory (2)

### Translation-memory poisoning leaks into other users' output
- **OWASP:** A08:2021 Software & Data Integrity Failures · **Difficulty:** Advanced · **Severity (report):** High
- **What it teaches:** Shared learned data is an attack surface: if anyone can write to it, everyone who reads it is downstream of the attacker.
- **Client impact:** An attacker rewrites what your client's platform outputs to paying customers — wrong legal wording, insults, or phishing text at scale.
- **Report title:** Shared translation memory accepts unauthenticated-quality writes (poisoning)
- **Remediation:** Scope TM writes per tenant, review shared entries, and version entries so poisoned rows can be rolled back.
- **Exploitation outline:** As omar@outsider.test, POST /tm/add (en→fr) source "Your order has shipped" with a hostile target; then, as Lena, translate that exact phrase EN→FR — your text comes out in her result.

### Stored XSS through glossary term into translation output
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate · **Severity (report):** High
- **What it teaches:** Data that is "just terminology" still becomes HTML somewhere — every rendering context needs encoding, especially data reused across features.
- **Client impact:** Stored script executes for translators and reviewers inside your client's app — a wormable XSS across the whole team.
- **Report title:** Stored XSS via glossary term rendered in translation output
- **Remediation:** Encode glossary terms on output everywhere they are rendered, including generated documents.
- **Exploitation outline:** Add a term source "checkout" with target <img src=x onerror=alert(1)> to one of your glossaries, then translate "checkout" using that glossary — the payload is served raw in the result.


## Glossaries & Term Bases (2)

### Private glossary IDOR — read another user's term base
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** Medium
- **What it teaches:** A privacy toggle in the UI is meaningless if the endpoint ignores it.
- **Client impact:** Trade-secret terminology — product names, pricing language, legal phrasing — leaks to any registered account.
- **Report title:** Private glossary readable by any authenticated user (IDOR)
- **Remediation:** Check the glossary visibility and ownership on the server for every read.
- **Exploitation outline:** Log in as marco@hexatranslate.local and open /glossary?id=202 — the private term base is served.

### Add terms to another user's glossary
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** Medium
- **What it teaches:** Write endpoints need ownership checks just as much as reads — unauthorised writes are integrity attacks, not just access bugs.
- **Client impact:** An attacker edits your client's official terminology so every future translation uses their wording — subtle, persistent sabotage.
- **Report title:** Missing authorisation allows writing to foreign glossaries
- **Remediation:** Verify glossary ownership (or editor role) on every term write.
- **Exploitation outline:** POST /terms with glossaryId=201 (Lena's glossary) while logged in as someone else — your term appears in her glossary.


## Review Workflow (1)

### Reviewer-role bypass — approve a review assigned to someone else
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** High
- **What it teaches:** Workflow roles only exist if the server enforces them at the action, not just by hiding buttons in the UI.
- **Client impact:** Unreviewed translations get "approved" and shipped to your client's customers — quality and legal exposure with a fake audit trail.
- **Report title:** Review approval not restricted to the assigned reviewer
- **Remediation:** Enforce reviewer assignment (or admin role) server-side on approve/reject actions and log the actor.
- **Exploitation outline:** Log in as marco@hexatranslate.local and POST /review/approve with id=301 — the review is approved and the project flips to Approved, though the review belongs to Rita.


## Credits & Billing (2)

### Negative top-up accepted (no amount validation)
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate · **Severity (report):** Medium
- **What it teaches:** Money-moving inputs need positive-value validation and server-side limits; the HTML form's min attribute is not a control.
- **Client impact:** Billing balances can be driven negative or manipulated at will — accounting chaos and free service for attackers.
- **Report title:** Credit top-up accepts negative amounts
- **Remediation:** Validate amounts server-side (positive, within plan limits) and reject non-numeric input.
- **Exploitation outline:** POST /credits/topup with amount=-500 — your credit balance drops by 500 (and a negative transfer can push it the other way).

### Negative credit transfer steals credits from the recipient
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate · **Severity (report):** High
- **What it teaches:** Business-logic flaws hide in arithmetic: every signed value in a money flow must be range-checked, or the flow runs backwards.
- **Client impact:** Attackers drain other customers' paid credit balances into their own accounts — theft, executed with valid requests.
- **Report title:** Negative transfer amount reverses credit flow
- **Remediation:** Reject non-positive transfer amounts and verify sender balance before applying.
- **Exploitation outline:** POST /credits/transfer to lena@hexatranslate.local with amount=-200 — 200 credits move FROM Lena TO you.


## API & Platform (4)

### API token is just base64 of the account email
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Intermediate · **Severity (report):** Critical
- **What it teaches:** An API credential must be unguessable and revocable; deriving it from a public identifier gives every attacker a master key.
- **Client impact:** Anyone who knows a customer's email address gets full API access to their translation projects — no password ever needed.
- **Report title:** Predictable API tokens derived from email addresses
- **Remediation:** Issue random, high-entropy API keys, store them hashed, and support revocation and rotation.
- **Exploitation outline:** Compute base64("lena@hexatranslate.local") and GET /api/projects?token=<that> — her identity is accepted and projects are returned.

### Unauthenticated /api/users dumps every account incl. passwords
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** Critical
- **What it teaches:** Every route needs an explicit authentication decision; framework defaults will not save an endpoint nobody remembered to protect.
- **Client impact:** Full credential dump of your client's customer base — instant account takeover everywhere those passwords are reused.
- **Report title:** Unauthenticated user-list endpoint exposes credentials
- **Remediation:** Require authentication and role checks on all API routes; never serialise password fields.
- **Exploitation outline:** GET /api/users with no cookies — the full user list, passwords included, comes back as JSON.

### /debug endpoint exposes configuration and secrets
- **OWASP:** A05:2021 Security Misconfiguration · **Difficulty:** Beginner · **Severity (report):** High
- **What it teaches:** Debug and diagnostics endpoints are production attack surface; anything that prints secrets must never ship.
- **Client impact:** Leaked signing secrets let attackers forge trusted requests against your client's platform.
- **Report title:** Debug endpoint exposes secrets and configuration
- **Remediation:** Remove debug endpoints from production, or gate them behind admin auth and IP allowlists.
- **Exploitation outline:** GET /debug — configuration, version and the API_SIGNING_SECRET are all in the response.

### Missing HTTP security headers
- **OWASP:** A05:2021 Security Misconfiguration · **Difficulty:** Beginner · **Severity (report):** Low
- **What it teaches:** Security headers are cheap defence-in-depth: without them, clickjacking and script-injection impact grow immediately.
- **Client impact:** Your client's app can be framed for clickjacking and lacks the browser-side safety net modern users expect.
- **Report title:** Missing HTTP security headers
- **Remediation:** Add CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy and HSTS at the server.
- **Exploitation outline:** GET /api/ping and check the response headers: the security header set is empty, and the check registers.


## Admin Panel (2)

### Role cookie tampering opens the admin panel
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** Critical
- **What it teaches:** Authorisation data must live server-side (in the session), never in values the client can edit.
- **Client impact:** Every registered user becomes an admin — full control of your client's platform, users and data.
- **Report title:** Client-controlled role cookie enables privilege escalation
- **Remediation:** Store roles in the server-side session only; ignore client-supplied role claims.
- **Exploitation outline:** Log in as any normal user, set cookie hx_role=admin, then open /admin — the panel, passwords and all, is served.

### CSRF on admin user deletion
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** High
- **What it teaches:** The more powerful the action, the more damage a CSRF hole does — destructive admin actions need tokens and re-confirmation.
- **Client impact:** One malicious page view by an admin deletes customer accounts on your client's platform.
- **Report title:** Missing CSRF protection on administrative user deletion
- **Remediation:** Add anti-CSRF tokens to all admin actions and require confirmation for destructive operations.
- **Exploitation outline:** As an admin (or via the tampered role), POST /admin/delete-user with id of a throwaway user and no token — the account is deleted.
