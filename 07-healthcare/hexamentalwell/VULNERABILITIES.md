# HexaMentalWell — Vulnerability Map (LAB 69)

Complete map of the 26 scored security tests in this lab, grouped by feature. Every entry is a real, working flaw in the app; a test is marked complete only when the exploit actually succeeds server-side.

## Login & Authentication (6)

### SQL injection login bypass
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** Submit an always-true SQL condition as the email; the string-built query returns a user row and a session is issued.
- **Impact:** On a real wellness platform this is full account takeover of the most sensitive accounts a company holds — journals, therapy notes and mood history — without knowing any password.

### Brute force — no rate limit or lockout
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** Submit 10+ failed logins for one account; every attempt is processed with no throttle, CAPTCHA or lockout.
- **Impact:** Attackers can grind through password lists against a client’s therapy account at full speed; the client only finds out after private journals are read.

### User enumeration via login & reset responses
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login, POST /forgot
- **Exploitation outline:** Probe 5+ distinct emails; existing and non-existing accounts produce visibly different responses.
- **Impact:** Simply being a user of a wellness platform is sensitive. Enumeration lets an attacker build a target list of real clients for phishing and password attacks.

### Published demo credentials still active
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **Location:** Login page demo box / POST /login
- **Exploitation outline:** Use the published demo therapist credentials to sign in; a full staff session is issued.
- **Impact:** Anyone on the internet can sign in as a therapist and reach real client data. Demo accounts must never survive into a live service.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Intermediate
- **Location:** POST /reset
- **Exploitation outline:** Derive the token MW-<id>-<id*331+77> for a victim id and reset their password without any email being sent.
- **Impact:** Anyone who knows a client’s user id can reset their password and take over the account — journals, notes and all.

### Role cookie tampering (hx_role)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** Cookie hx_role / GET /admin
- **Exploitation outline:** Change the hx_role cookie to admin as a normal client and load the admin console.
- **Impact:** Any client can promote themselves to admin of a healthcare platform by editing one cookie — the entire client base is exposed.

## Registration & Profile (4)

### Weak password policy (1-character passwords)
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /register
- **Exploitation outline:** Register with a 1-character password; the account is created.
- **Impact:** Clients who pick "x" as a password hand attackers a one-guess login to their private journals.

### Mass assignment — self-assign therapist role
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /register
- **Exploitation outline:** Add role=therapist to the registration POST; the created account carries the staff role.
- **Impact:** Anyone can mint themselves a therapist account and be treated as staff by the platform — instant insider access to client records.

### Stored XSS in display name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** POST /register, POST /profile → dashboards
- **Exploitation outline:** Store a script payload as the display name; it is rendered unescaped to other users.
- **Impact:** A malicious "client" can run script in a therapist’s or admin’s browser — session theft against the very staff who hold the keys to all records.

### CSRF on profile update
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /profile
- **Exploitation outline:** Submit a profile change with the session cookie but no hx_origin marker; it is applied.
- **Impact:** A booby-trapped page visited by a logged-in therapist can silently rewrite their profile — the first step in social-engineering clients.

## Journals & Privacy (4)

### Read another client’s journal (IDOR)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /journals/:id
- **Exploitation outline:** Request a journal whose clientId differs from the session user; the full private entry is served.
- **Impact:** The most private text a person writes — their therapy journal — is readable by any other client by changing one number. This single flaw destroys a wellness platform’s trust.

### Therapist reads journals of unassigned clients
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /journals/:id
- **Exploitation outline:** As a therapist, read a journal whose client is assigned to a different therapist; it is served.
- **Impact:** Any staff member can browse every client’s journal, including people they have never treated — an insider-privacy failure regulators take very seriously.

### Journal export of another client
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /journals/export
- **Exploitation outline:** Request the export for another client id; their full journal text is returned.
- **Impact:** One request downloads a client’s entire journal history. Bulk export flaws turn a privacy bug into a full data breach.

### Support context tool leaks journal text to any user
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Advanced
- **Location:** GET /support/context/:clientId
- **Exploitation outline:** As a non-admin user, fetch the support context for another client; journal excerpts are returned.
- **Impact:** A convenience feature for support quietly hands every signed-in user a window into any client’s diary.

## Mood Tracking (2)

### Another client’s mood history (IDOR)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /moods?client=
- **Exploitation outline:** Request the mood list for another client id; their scores and notes are served.
- **Impact:** Mood history reveals a person’s mental-health trajectory — exactly the data wellness users expect to stay private.

### Forge mood entries in another client’s record
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /moods
- **Exploitation outline:** Submit a mood entry carrying another client’s id; it is stored in their record.
- **Impact:** Attackers can falsify a client’s health record, misleading their therapist and corrupting care decisions.

## Sessions & Booking (3)

### Session notes visible to the wrong party
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /sessions/:id/notes
- **Exploitation outline:** Fetch notes for a session you are not a party to; the therapist’s private notes are returned.
- **Impact:** A client reading another client’s therapy notes is a reportable privacy breach on its own.

### Book a session in another client’s name
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /sessions/book
- **Exploitation outline:** Book with a clientId different from the session user; the session is created under the victim.
- **Impact:** Attackers can fill a victim’s calendar with fake therapy sessions, causing missed real care and billing chaos.

### Cancel another client’s session
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** POST /sessions/:id/cancel
- **Exploitation outline:** Cancel a session owned by another client; its status becomes cancelled.
- **Impact:** A malicious user can cancel real therapy appointments for vulnerable clients — a safety issue, not just an inconvenience.

## Payments (2)

### Session payment amount tampering ($1 for a $60 session)
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **Location:** POST /sessions/:id/pay
- **Exploitation outline:** Submit a payment far below the session price; the session is recorded as paid in full.
- **Impact:** Every client can settle $60 therapy sessions for $1 — direct revenue loss that scales with one shared trick.

### Free session via unverified mark-paid endpoint
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /sessions/:id/mark-paid
- **Exploitation outline:** Call the mark-paid endpoint directly; the session becomes paid with no payment.
- **Impact:** Anyone can mark every session paid without a cent changing hands — total billing bypass.

## Therapist Directory (2)

### SQL injection in therapist search dumps user table
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Location:** GET /therapists?q=
- **Exploitation outline:** Inject an always-true condition into the search; all user rows are returned.
- **Impact:** One search discloses the whole user database of a health platform — names, emails and passwords of every client.

### Reflected XSS in therapist search
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** GET /therapists?q=
- **Exploitation outline:** Submit a script payload as the search term; it is reflected unescaped in the response.
- **Impact:** A crafted link sent to a therapist runs script in their browser — a stepping stone to staff session theft.

## Support & Admin (1)

### CSRF on admin account deactivation
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Advanced
- **Location:** GET /admin/users/:id/deactivate
- **Exploitation outline:** Trigger the deactivation GET with a cross-site Referer under an admin session; the target account is deactivated.
- **Impact:** One malicious page view by an admin can deactivate client or therapist accounts — sabotage of a live care service.

## Platform & API (2)

### Unauthenticated /api/debug dumps all accounts
- **OWASP:** A05:2021 Security Misconfiguration
- **Difficulty:** Beginner
- **Location:** GET /api/debug
- **Exploitation outline:** Fetch /api/debug without any session; full user records including passwords are returned.
- **Impact:** The complete credential list of a healthcare platform, public. Every account — clients, therapists, admin — is compromised at once.

### Forgeable API token (base64 of email)
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Intermediate
- **Location:** GET /api/me (Authorization: Bearer)
- **Exploitation outline:** Present mhw_+base64(victim email) as the Bearer token; the API authenticates as the victim.
- **Impact:** Anyone who knows a therapist’s email address owns their API identity — and emails are printed in the public directory.
