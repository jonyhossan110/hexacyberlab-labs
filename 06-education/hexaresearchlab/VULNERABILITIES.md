# HexaResearchLab (LAB 60) — Vulnerability Map

All 26 scored tests, grouped by feature. This is the complete map of what the lab contains.

## Login & Authentication

### SQL Injection — Login Bypass
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation:** Submit a login whose email contains a tautology injection (' OR '1'='1). The string-built query matches the first user row and a session is issued without any valid password.
- **Impact:** On a real portal this is full account takeover without any password — every author, reviewer and editor account, and every unpublished paper behind them, is exposed.

### Brute Force — No Rate Limiting on Login
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation:** Submit 10 or more wrong passwords for one account. Every attempt is processed at full speed — no lockout, no delay, no CAPTCHA.
- **Impact:** Attackers can grind through weak passwords for researcher accounts around the clock; one guessed editor password hands them every submission and decision in the portal.

### User Enumeration via Password Reset
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Location:** POST /forgot-password
- **Exploitation:** The forgot-password form replies "reset link sent" for real accounts and "no account found" for invented ones. Probe at least 5 different emails and compare the answers.
- **Impact:** Attackers harvest a verified list of which researchers use the portal, then aim phishing and password spraying precisely at them.

### Default Demo Credentials Accepted
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Location:** POST /login (demo account)
- **Exploitation:** The login page publicly offers a demo account (demo@hexaresearchlab.local / demo123). Sign in with it — a published password is a working password.
- **Impact:** Anyone on the internet can walk straight into the portal with the demo password and start probing internal features as an authenticated user.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Intermediate
- **Location:** POST /reset-password
- **Exploitation:** Reset tokens are derived from the account's public email: 'HXRESET-' plus the first 12 characters of the base64 encoding of the email. Compute the token for any user and reset their password without ever requesting a link.
- **Impact:** Any account — including the editor-in-chief — can be taken over by a stranger who knows only an email address, with no mailbox access needed.

### Role Cookie Tampering Grants Editor Access
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Location:** GET /editor
- **Exploitation:** Login sets a client-side hx_role cookie. The /editor console trusts that cookie instead of the server-side session. Set hx_role to editor in your browser and open /editor with an ordinary account.
- **Impact:** Any registered user can promote themselves to editor in their own browser and reach the editorial console, including pending decisions on papers.

## Registration & Profile

### Mass Assignment — Self-Assigned Editor Role at Registration
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /register
- **Exploitation:** The registration handler copies every submitted field onto the new account. Add a field the form never shows — role=editor — and the account is created as an editor.
- **Impact:** A stranger can register themselves as an editor — no approval, no insider help — and immediately join the workflow that accepts and rejects papers.

### Weak Password Policy — 1-Character Passwords Accepted
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Location:** POST /register
- **Exploitation:** Register an account with a password of a single character. There is no length or complexity policy at all.
- **Impact:** Accounts protected by trivial passwords fall instantly to guessing, handing attackers legitimate logins into the submission system.

### Stored XSS in Display Name
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate
- **Location:** POST /register, POST /profile/update
- **Exploitation:** The display name is stored and later rendered unencoded in the page header for that user. Register or rename yourself with a name containing a script payload and it is stored as-is.
- **Impact:** A crafted display name executes script in the browsers of editors and reviewers who share pages with it — a stepping stone to session theft and actions taken in their name.

### CSRF on Profile Update
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /profile/update
- **Exploitation:** The profile form renders a same-site marker field, but the server never verifies it. Submit the update from a cross-site origin (or with the marker missing) and the change is saved anyway.
- **Impact:** A malicious page a researcher merely visits can silently rewrite their profile — the classic first step toward account-takeover chains and impersonation.

## Paper Submissions

### Paper IDOR — Reading Another Author's Paper
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Location:** GET /papers/:id
- **Exploitation:** Paper pages are keyed by a small numeric id and never check your relationship to the paper. Sign in as one author and open another author’s paper in full.
- **Impact:** Unpublished research — the crown jewels of a research portal — can be read and stolen by any registered user, including competitors of the authors.

### Manuscript Download Without Authorisation
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Location:** GET /papers/:id/manuscript
- **Exploitation:** The manuscript endpoint repeats the paper page’s missing check: any signed-in user can download the full text of any paper, assigned or not.
- **Impact:** Complete manuscripts can be bulk-harvested by any user, leaking unpublished findings, data and methods before peer review even finishes.

### Unrestricted File Upload — Stored HTML Served From the Portal
- **OWASP:** A05:2021 Security Misconfiguration · **Difficulty:** Intermediate
- **Location:** POST /papers/:id/upload, GET /files/:name
- **Exploitation:** Attachments are accepted with no type check and served back under the portal origin with a content type taken from the extension. Upload evil.html with markup inside and open /files/evil.html — it renders as a page of this portal.
- **Impact:** Attackers can host phishing pages and script under the portal’s trusted address, aimed at editors and reviewers — the perfect lure inside a trusted workflow.

### Path Traversal in Supplementary File Download
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Location:** GET /download?file=
- **Exploitation:** The download helper joins the requested name onto the files folder without sanitising it. Ask for ../data/editor-notes.txt and the editors’ private notes are served.
- **Impact:** Internal files outside the download folder — editorial notes, configuration, other submissions — become readable to any user, and on real systems this often reaches credentials.

## Peer Review

### Review Submitted Without Assignment
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /papers/:id/reviews
- **Exploitation:** The review form only appears for assigned reviewers, but the endpoint trusts any signed-in POST. Submit a review for a paper you were never assigned to.
- **Impact:** Anyone can inject fake peer reviews into any submission — rigging outcomes, sinking rivals’ papers or praising their own allies.

### Tampering With Another Reviewer's Score
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /reviews/:id/score
- **Exploitation:** The score-update endpoint is keyed by review id and never asks whose review it is. POST a new score for a review you did not write.
- **Impact:** Review scores — the numbers editorial decisions rest on — can be silently rewritten by rivals, changing which papers get accepted.

### Reviewer Identity Leak to Authors (Double-Blind Broken)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Location:** GET /api/papers/:id/reviews
- **Exploitation:** A JSON endpoint returns full review records — including reviewer names and emails — to the paper’s author, destroying double-blind anonymity. Fetch it as the author.
- **Impact:** Authors learn exactly who criticised their work — enabling retaliation, pressure and collusion, and destroying trust in the double-blind process the portal promises.

### Author Assigns Themselves as Reviewer of Their Own Paper
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /papers/:id/assign
- **Exploitation:** Reviewer assignment is an editor job, but the endpoint only checks that you are signed in. As a paper’s author, POST your own email to its assign endpoint and you become its reviewer.
- **Impact:** Authors can review their own submissions and guarantee acceptance — the single most damaging fraud a peer-review system can allow.

### Accept/Reject Decision Made by a Non-Editor
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /papers/:id/decide
- **Exploitation:** The decision endpoint sets a paper’s status to accepted or rejected and never checks the caller’s role. POST a decision as a plain author and the status changes.
- **Impact:** Any user can accept or reject any paper — the entire editorial process becomes meaningless and publication integrity collapses.

### Accepting a Review Invitation Addressed to Someone Else
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Location:** POST /invitations/:id/accept
- **Exploitation:** Invitations are keyed by small numeric ids and the accept endpoint never compares the addressee with the caller. Accept an invitation issued to another reviewer and you take their seat.
- **Impact:** Attackers can seat themselves as reviewers on targeted papers by accepting invitations meant for genuine experts — another road to rigged reviews.

## Search

### SQL Injection in Paper Search
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Location:** GET /search?q=
- **Exploitation:** Search builds its query the same string-built way as login. Search for ' OR '1'='1 and the WHERE clause is true for every row — all papers return, including ones the term never matched.
- **Impact:** Search injection can dump the entire catalogue — including under-review papers that should stay invisible — and on real stacks it escalates to full database extraction.

### Reflected XSS in Search Results
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Location:** GET /search?q=
- **Exploitation:** The results page repeats your search term back unencoded. Put a script payload in q and it is reflected raw into the page.
- **Impact:** A booby-trapped search link sent to an editor runs script in their browser under the portal origin — session theft and actions in their name follow.

## Admin Panel

### Admin Panel Open to Any Signed-In User
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Location:** GET /admin
- **Exploitation:** The admin console checks only that somebody is signed in — never who. Open /admin with an ordinary researcher account and browse the user administration.
- **Impact:** Every registered user can see the full account list and reach admin actions — one step from taking over the portal entirely.

### CSRF on Admin Role Change
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /admin/users/:id/role
- **Exploitation:** Admin role changes are plain POSTs and the same-site marker is never verified. Submit a role change with a cross-site Origin (or no marker) and the role still changes.
- **Impact:** Tricking one admin (or any user, given the open admin panel) into visiting a hostile page can silently promote an attacker’s account to admin.

## Platform & API

### Weak API Token — Base64 of the Account Email
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Intermediate
- **Location:** GET /api/papers (X-Api-Key header)
- **Exploitation:** The API checks X-Api-Key against issued keys, but a legacy fallback also accepts the base64 encoding of any user’s email. Send that as the key and the API lets you in.
- **Impact:** Anyone who knows a single email address — public information for researchers — holds a working API key to the submission catalogue.

### Sensitive Data Exposure — /api/debug Dumps All Users and Passwords
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Location:** GET /api/debug
- **Exploitation:** A leftover debug endpoint returns every account record, including plaintext passwords, with no authentication at all. Fetch /api/debug.
- **Impact:** One unauthenticated request hands an attacker every account and password on the portal — total compromise in a single call.
