# HexaForum — Vulnerabilities (LAB 82)

Complete map of every scored test in this lab, grouped by feature. 26 tests across 8 features.

## Login & Authentication (6)

### SQL Injection Login Bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Exploitation outline: Use admin@hexaforum.local' OR '1'='1 as the email with any password — the query matches the first user (the admin) and logs you in as them.
- Impact: On a real forum this hands an attacker the admin account in seconds: full control of members, private boards and private messages.

### Brute Force — No Rate Limit or Lockout
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Exploitation outline: Submit 10+ wrong passwords for alice@hexaforum.local — every attempt is still processed, with no lockout, delay or CAPTCHA.
- Impact: Members with weak passwords get taken over silently; a hijacked moderator account can then be used to attack the whole community.

### User Enumeration via Login & Forgot-Password Responses
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Exploitation outline: Probe at least 5 different emails across /login and /forgot and diff the responses — "No account found" vs "Incorrect password" tells you exactly which emails are registered.
- Impact: Attackers first harvest a list of valid member emails, then aim password spraying and phishing precisely at real accounts.

### Published Demo Moderator Credentials
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Exploitation outline: Log in with the published demo moderator credentials shown on the login page (mod@hexaforum.local) — a privileged account protected only by a password everyone can read.
- Impact: Anyone on the internet can sign in as a moderator: read the staff board, private messages metadata and abuse moderation powers.

### Predictable Password-Reset Token
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Exploitation outline: Tokens look like HF<id>-<id x 137 + 42>. Bob is user 3, so compute HF3-453 and POST it to /reset without ever requesting a reset for Bob — then log in with your new password.
- Impact: Any member account — including staff — can be taken over by anyone who knows the victim's user id, which the forum displays everywhere.

### Role Cookie Tampering into the Moderation Console
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: As a plain member, set the cookie hx_role=moderator (or admin) and visit /mod — the console trusts the client-supplied cookie instead of the server-side account role.
- Impact: Every registered member can promote themselves to moderator and read staff-only areas and wield moderation tools.

## Registration & Profile (4)

### Weak Password Policy at Registration
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Exploitation outline: Register a new account with a 1-character password — it is accepted immediately.
- Impact: Client members pick trivial passwords, and combined with no rate limiting their accounts fall in bulk.

### Mass Assignment — Role & Reputation at Registration
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: Add role=moderator and reputation=9999 to the /register POST — the new account is created as a moderator with 9,999 reputation.
- Impact: Attackers mint their own moderator accounts and maxed-out reputation, destroying trust in the forum's ranking and moderation.

### Stored XSS in Display Name
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Exploitation outline: Register (or rename yourself) with a display name like <script>alert(1)</script> or <img src=x onerror=alert(1)> — it is stored and rendered raw to everyone, including admins.
- Impact: An attacker's script runs in the browsers of members and admins who view the member list — session theft and admin actions follow.

### CSRF on Profile Update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: POST to /profile/update with only your session cookie and NO hx_origin marker (e.g. from a raw curl request) — the name change is accepted, proving a malicious site could do the same to a logged-in victim.
- Impact: A booby-trapped page silently renames members or swaps their details — combined with stored XSS fields this becomes account-level sabotage.

## Boards & Threads (4)

### Private Staff Board Readable by Any Member
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: As a plain member, open /board/3 (Staff Lounge) directly — internal threads about ban lists and alt accounts are served to you.
- Impact: Internal staff discussions — ban plans, suspected users, moderation strategy — leak to the very members being discussed.

### Hidden (Removed) Thread Still Readable by Direct URL
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: Open /thread/6 directly as a member — the hidden thread is still fully served; only the listing hides it.
- Impact: Content moderators removed for safety (leaks, abuse, legal risk) stays publicly reachable, defeating the moderation action entirely.

### Edit Another User's Post (Post IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: POST to /post/3/edit as Alice with a new body — Bob's post is rewritten, because the endpoint never checks authorship.
- Impact: Members can rewrite or deface anyone's posts, plant malicious content under trusted names and rewrite history in disputes.

### Stored XSS in Post Body
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Exploitation outline: Reply in any thread with a body containing <script>alert(1)</script> or an <img onerror> payload — it is stored and served raw to every reader.
- Impact: A single malicious reply can steal session cookies of hundreds of members — and of any moderator who opens the thread to review it.

## Search (2)

### SQL Injection in Forum Search Leaks Private Threads
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- Exploitation outline: Search for ' OR '1'='1 — the tautology makes the query match everything, including Staff Lounge and hidden threads that normal search never shows.
- Impact: Private staff threads and moderator-removed content become searchable by any member — confidentiality and moderation both fail at once.

### Reflected XSS in Search Results
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Exploitation outline: Search for <script>alert(1)</script> — the payload is reflected raw into the results page heading.
- Impact: A crafted search link sent to a member or moderator runs script in their session when clicked — a reliable phishing-to-takeover bridge.

## Reputation & Voting (3)

### Self-Upvoting Your Own Posts
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: POST to /post/<your post id>/vote with value=1 as its author — your reputation increases.
- Impact: Members inflate their own reputation at will, corrupting the trust ranking the community and its moderators rely on.

### Vote Amount Tampering (Arbitrary Reputation)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: POST a vote with value=999 — the author's reputation jumps by 999. The server trusts the client-supplied amount completely.
- Impact: Reputation — the forum's trust currency — becomes worthless: anyone can crown themselves (or nuke a rival with a negative amount).

### Repeat Voting on the Same Post
- OWASP: A04:2021 Insecure Design
- Difficulty: Beginner
- Exploitation outline: Vote on the same post two or more times — every request adds reputation again; there is no one-vote-per-user record.
- Impact: Small groups can brigade any member to the top (or bottom) of the reputation ladder with a simple repeat-request script.

## Private Messages (2)

### Read Another User's Private Message (PM IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: As Alice, open /pm/4 — Carol's private message (including her backup email) is served to you.
- Impact: Every private conversation on the forum — personal details, contact info, staff notes — is readable by every member.

### Send a PM Spoofed as Another User
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: POST to /pm/send with a from field naming another user (e.g. the admin's id or email) — the message is stored and delivered as if they sent it.
- Impact: Members can impersonate the admin in private messages — the perfect channel for scamming other members ("send me your password to verify your account").

## Moderation & Admin (3)

### Member Performs Moderation Action (Pin Thread)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: As a plain member, POST to /thread/<id>/pin — the thread is pinned. No role check exists on the server.
- Impact: Any member can pin, promote or manipulate threads — vandalising the forum's front page and undermining the moderation team.

### CSRF on Admin User-Ban Action
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: As the admin, POST to /admin/ban with only the session cookie and NO hx_origin marker — the ban is applied, proving any site the admin visits could ban users through their browser.
- Impact: A malicious link or page visited by the admin can ban members (or worse) with the admin's own authority — no password needed.

### Admin Panel Open to Any Logged-In Member
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: Log in as a plain member and open /admin — the full user list, including passwords and roles, is served.
- Impact: Every member can read all credentials and account data — total compromise of the community from a single ordinary account.

## Platform & API (2)

### API Token Is Just Base64 of Your Email
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Exploitation outline: Send GET /api/mydata with header X-Api-Token set to base64(victim email) and no session cookie — the API returns that user's data.
- Impact: Anyone who knows (or guesses) a member's email gets full API access to their data without ever knowing a password.

### Unauthenticated Debug Endpoint Dumps All Users
- OWASP: A05:2021 Security Misconfiguration
- Difficulty: Beginner
- Exploitation outline: Open /api/debug with no login at all — it returns every user record, including passwords, roles and reputation.
- Impact: The entire member database — credentials included — is downloadable by anyone on the internet in one request.
