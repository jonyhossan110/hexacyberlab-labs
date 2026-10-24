# HexaChat (LAB 89) — Vulnerability Map

All 26 scored tests, grouped by feature. Every item is a real, working flaw in this local training build.

## Login & Authentication

### SQL Injection Login Bypass
- OWASP: A03:2021 – Injection
- Difficulty: Beginner
- Location: POST /login
- Exploitation outline: Use admin@hexachat.local' OR '1'='1' -- as the email and any password — the query stops checking the password.
- Impact: On a real messaging product this is instant account takeover — an attacker reads private conversations as any user, including admins, without knowing a single password.

### No Brute-Force Protection on Login
- OWASP: A07:2021 – Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /login
- Exploitation outline: Fail 10 logins in a row for alice@hexachat.local — the 10th is still accepted for processing.
- Impact: Attackers can grind through password lists against real accounts at full speed; weak passwords fall in minutes and the business never notices.

### User Enumeration via Login & Reset Responses
- OWASP: A07:2021 – Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /login and POST /forgot
- Exploitation outline: Probe 5 different emails across /login and /forgot and collect the two different answers.
- Impact: Attackers first harvest which email addresses have accounts, then aim phishing and password attacks only at real users — much higher success, much less noise.

### Published Demo Credentials
- OWASP: A07:2021 – Identification and Authentication Failures
- Difficulty: Beginner
- Location: Login page / POST /login
- Exploitation outline: Sign in with the demo account printed on the login page.
- Impact: Anyone on the internet can sign in with credentials the business itself published — no skill required — and pivot from that account into real users.

### Predictable Password-Reset Token
- OWASP: A07:2021 – Identification and Authentication Failures
- Difficulty: Intermediate
- Location: POST /reset
- Exploitation outline: For user id N the token is HC<N>-<N*149+37>. Compute one for Bob and reset his password without ever requesting a reset.
- Impact: Full account takeover of any user, including admins, by anyone who can see a user id — no inbox access needed.

### Role Cookie Tampering (hx_role)
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Intermediate
- Location: GET /admin
- Exploitation outline: Set the hx_role cookie to admin in your browser and open /admin as a normal user.
- Impact: Any ordinary user becomes an administrator by editing a cookie — full control of the platform, its users and its data.

## Registration & Profile

### Weak Password Policy (1-Character Passwords)
- OWASP: A07:2021 – Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /register
- Exploitation outline: Register a new account with the password "x" — it is accepted.
- Impact: Accounts protected by one-character passwords are guessed instantly, turning small leaks into full account takeovers.

### Mass Assignment: Role Granted at Registration
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Intermediate
- Location: POST /register
- Exploitation outline: POST /register with an extra role=admin field — the new account is created as an administrator.
- Impact: Self-service admin creation: an attacker registers and is instantly an administrator of the whole platform.

### Stored XSS in Display Name
- OWASP: A03:2021 – Injection
- Difficulty: Intermediate
- Location: POST /register, POST /profile → rendered on /members
- Exploitation outline: Register or rename with the display name <script>alert(1)</script> and open /members.
- Impact: Attackers plant scripts that fire for every user who views a member list — session theft, fake login forms and actions taken in victims’ names.

### CSRF on Profile Update
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Intermediate
- Location: POST /profile
- Exploitation outline: POST /profile with a new display name and NO hx_marker field — the change is applied anyway.
- Impact: A malicious page open in one tab can silently rename a user, change their profile, or worse — in their name, from their browser.

## Direct Messages

### Read Another User’s Private Conversation (IDOR)
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Beginner
- Location: GET /conversations/:id
- Exploitation outline: As Alice, open /conversations/3 — that is Bob and Carol’s private chat.
- Impact: Every private conversation on the platform is readable by any signed-in user — total loss of the privacy the product promises.

### Delete Another User’s Message
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Intermediate
- Location: POST /messages/:id/delete
- Exploitation outline: POST /messages/<id>/delete for a message authored by Bob, while signed in as Alice.
- Impact: Users can erase other people’s messages — destroying evidence of abuse, fraud or agreements and undermining trust in the platform.

### Blocked User Can Still Send Messages (API Path)
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Intermediate
- Location: POST /api/send
- Exploitation outline: As Carol, POST /api/send with {"to":2,"text":"..."} — the message to Alice is delivered despite the block.
- Impact: Blocking — the main tool users have against harassment — silently fails, exposing victims to continued abuse.

## Groups & Channels

### Join a Private Group Without an Invite
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Beginner
- Location: POST /groups/:id/join
- Exploitation outline: As Carol, POST /groups/2/join with no invite field at all — you become a member of the private group.
- Impact: Private communities — family groups, internal teams, paying members — are open to anyone who finds the join button’s URL.

### Read Private Group Messages as a Non-Member
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Beginner
- Location: GET /groups/:id
- Exploitation outline: As Carol (not a member), open /groups/2 and read the private group’s messages.
- Impact: The entire history of a private group is exposed to any signed-in account, including anything sensitive members shared believing it was closed.

### Self-Promote to Group Admin
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Intermediate
- Location: POST /groups/:id/role
- Exploitation outline: As Bob (a plain member of group 2), POST /groups/2/role with your own userId and role=admin.
- Impact: Any member can seize control of any group — changing settings, removing people, reading everything — from one request.

### Remove the Group Owner as a Regular Member
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Advanced
- Location: POST /groups/:id/remove
- Exploitation outline: As Bob, POST /groups/2/remove with userId=2 — the owner, Alice, is removed from her own group.
- Impact: A single member can hijack a community by deleting its owner — locking out leadership and taking over the space.

## Attachments

### Download Another User’s Attachment (IDOR)
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Beginner
- Location: GET /attachments/:id
- Exploitation outline: As Alice, open /attachments/2 — that file belongs to Bob’s private conversation with Carol.
- Impact: Contracts, photos and documents users shared privately can be downloaded by anyone — a direct privacy and data-protection breach.

### Path Traversal on File Download
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Intermediate
- Location: GET /download?file=
- Exploitation outline: Request /download?file=../server.js — the app serves its own source code.
- Impact: Attackers read source code, configuration and secrets from the server itself — the first step to full compromise.

### Unrestricted Upload: Stored HTML/SVG File Served
- OWASP: A03:2021 – Injection
- Difficulty: Intermediate
- Location: POST /upload → GET /files/<name>
- Exploitation outline: Upload a file named page.html containing a <script> payload, then open /files/page.html — it runs as a page of this site.
- Impact: Attackers store phishing pages and scripts under the business’s real domain, abusing its reputation and stealing sessions from anyone who opens the link.

## Search

### SQL Injection in Message Search
- OWASP: A03:2021 – Injection
- Difficulty: Intermediate
- Location: GET /search?q=
- Exploitation outline: Search for ' OR '1'='1 — the results dump every message on the platform, private groups included.
- Impact: One search dumps the entire message database: private DMs and closed groups included — a complete privacy breach from a single request.

### Reflected XSS in Search
- OWASP: A03:2021 – Injection
- Difficulty: Beginner
- Location: GET /search?q=
- Exploitation outline: Search for <script>alert(1)</script> and view the page source: your payload is reflected unescaped.
- Impact: Attackers send victims links to the real site that run attacker scripts in the victim’s session — phishing and account actions under a trusted domain.

## Admin Panel

### Moderator Console Open to Any Logged-In User
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Beginner
- Location: GET /moderator
- Exploitation outline: Sign in as any regular user and open /moderator — the reports queue is served.
- Impact: Internal moderation data — abuse reports, reporter identities, flagged content — leaks to the very users being reported.

### CSRF on Admin Ban Action
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Intermediate
- Location: POST /admin/ban
- Exploitation outline: As admin, POST /admin/ban with a userId and NO hx_marker — the user is banned anyway.
- Impact: An admin who merely opens a malicious page can be made to ban users — sabotage carried out with the admin’s own authority.

## Platform & API

### Weak API Token (Base64 of Email)
- OWASP: A07:2021 – Identification and Authentication Failures
- Difficulty: Intermediate
- Location: GET /api/conversations
- Exploitation outline: Send GET /api/conversations with header X-Api-Token set to the base64 of bob@hexachat.local — his conversations are returned, no login needed.
- Impact: Anyone who knows or guesses a user’s email address gets API access to their private conversations — no password, no trace.

### Unauthenticated Debug Data Dump (/api/debug)
- OWASP: A05:2021 – Security Misconfiguration
- Difficulty: Beginner
- Location: GET /api/debug
- Exploitation outline: Open /api/debug in a fresh browser with no cookies — every account, including passwords, is returned as JSON.
- Impact: The full user database — emails and passwords — is public to the entire internet; every account falls at once.
