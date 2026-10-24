# HexaGit — Vulnerability Map (LAB 25)

All 26 scored tests, grouped by feature. Each entry: OWASP category, where it lives, how it is exploited, and the business impact. Detection is server-side — a test passes only when the exploit's real effect is observed.

## Login & Authentication (6)

### SQL injection login bypass (legacy auth path)
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Exploitation outline:** Classic: admin' OR '1'='1 as the username, any password.
- **Impact:** On a real client this is a full account takeover of the most powerful account, with no password needed.
- **Report:** SQL Injection in Login Form Allows Authentication Bypass (Critical) — Use parameterised queries everywhere; never build SQL by string concatenation.

### Brute force — no rate limit or lockout on login
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Exploitation outline:** Submit 10 wrong passwords for alice from one session; nothing slows you down.
- **Impact:** Weak client passwords fall quickly to automated guessing; the client only finds out after the account is abused.
- **Report:** Missing Rate Limiting on Authentication Endpoint (High) — Add progressive delays, lockout and alerting after repeated failed logins.

### User enumeration via password-reset responses
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Exploitation outline:** Compare the two responses word for word — one confirms the account is real.
- **Impact:** Attackers confirm which employee accounts exist, then focus phishing and password spraying exactly there.
- **Report:** Username Enumeration via Password Reset (Medium) — Return one identical, generic response whether or not the account exists.

### Default credentials on the deploy service account
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Exploitation outline:** Try deploy / deploy.
- **Impact:** A forgotten service account gives attackers a quiet, legitimate-looking login that bypasses most monitoring.
- **Report:** Default Credentials on Service Account (High) — Force a unique strong password at first use; inventory and rotate all service accounts.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Exploitation outline:** Format: HXGRST-<userId>-<unix minutes>. Compute one for alice (id 2) without asking the app.
- **Impact:** An attacker resets the password of any client account — including admins — without ever seeing an email.
- **Report:** Predictable Password Reset Token (High) — Generate reset tokens with a CSPRNG, store only a hash, expire them quickly, single use.

### Session/cookie role tampering opens the admin panel
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Exploitation outline:** Set hx_role=admin in your browser, keep your normal session, then visit /admin.
- **Impact:** Any ordinary user becomes an admin — full control of the client platform with a one-word cookie edit.
- **Report:** Client-Side Role Cookie Trusted for Authorization (Critical) — Determine roles from the server-side session record only; ignore role claims from cookies.

## Registration & Profile (4)

### Weak password policy — 1-character passwords accepted
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Exploitation outline:** A single character is accepted.
- **Impact:** Client users pick trivial passwords; one guessed account can expose private repositories and code.
- **Report:** No Minimum Password Strength Enforced (Medium) — Enforce a minimum length (12+) and block known-breached passwords at registration.

### Mass assignment — role field accepted at registration
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Exploitation outline:** POST /register with role=admin alongside the normal fields.
- **Impact:** Attackers mint their own admin accounts on the client platform — no exploit chain needed, just one extra field.
- **Report:** Mass Assignment Allows Admin Role at Registration (Critical) — Whitelist assignable fields server-side; never accept role/privilege fields from the client.

### Stored XSS in profile display name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Exploitation outline:** Set your display name to <script>alert(1)</script> and view your profile.
- **Impact:** Attackers hijack the sessions of anyone who views the poisoned profile — including client admins.
- **Report:** Stored Cross-Site Scripting in Display Name (High) — Escape all user content on output and add a Content-Security-Policy.

### CSRF on profile update (no token, no origin check)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Exploitation outline:** Submit the profile form from a context without the hx_origin cookie (e.g. curl with only your session cookie).
- **Impact:** A malicious page silently rewrites a client user's profile — a stepping stone to account takeover via email change.
- **Report:** Cross-Site Request Forgery on Profile Update (Medium) — Require a per-session CSRF token (or strict origin checks) on every state-changing request.

## Repositories (4)

### Private repository readable by any logged-in user (IDOR)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Exploitation outline:** Open /repo/102 directly. Nobody checks that it is private.
- **Impact:** On a real client, private source code — their core IP — is readable by anyone who creates a free account.
- **Report:** Broken Access Control: Private Repositories Exposed by ID (Critical) — Check ownership/collaborator rights on every repository read, regardless of how the id was obtained.

### Repository settings changed by a non-owner
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Exploitation outline:** POST a new visibility to /repo/101/settings as bob.
- **Impact:** A stranger can flip a private client repo to public, or lock the owner out of their own project settings.
- **Report:** Missing Ownership Check on Repository Settings (High) — Authorize settings changes to the repository owner (or repo admins) only.

### Stored XSS in repository description
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Exploitation outline:** Use <script>alert(1)</script> in the description and view the repo.
- **Impact:** One poisoned repo description attacks every developer who browses it, spreading through a client's whole team.
- **Report:** Stored Cross-Site Scripting in Repository Description (High) — Escape descriptions on output; sanitise any allowed markup with a proven library.

### Repository transfer executed by a non-owner (transfer hijack)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Exploitation outline:** POST /repo/101/transfer with newOwner=bob — the repo changes hands.
- **Impact:** An attacker steals a client's repository outright — code, history and collaborators all move to the attacker.
- **Report:** Repository Ownership Transfer Without Authorization (Critical) — Restrict transfers to the current owner, require re-authentication and notify both parties.

## Branches & Files (2)

### Path traversal in raw file view exposes server config
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Exploitation outline:** GET /repo/101/raw?path=../../app-config reads the server's internal config.
- **Impact:** Server configuration and secrets leak — the keys an attacker needs to pivot into the client's infrastructure.
- **Report:** Path Traversal in File Download Exposes Server Files (High) — Resolve paths against a fixed base directory and reject anything escaping it.

### Direct push to protected main branch by a non-owner
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Exploitation outline:** POST /repo/101/push with branch=main.
- **Impact:** Unreviewed code lands directly in the client's production branch — the classic supply-chain nightmare.
- **Report:** Protected Branch Accepts Direct Pushes from Non-Owners (High) — Enforce branch protection server-side: only owners/admins or approved PR merges may write to main.

## Pull Requests (2)

### Author can approve their own pull request (self-approval)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Exploitation outline:** Log in as bob and approve PR 1 — your own approval counts.
- **Impact:** A malicious or careless change reviews itself into the client codebase with a perfect audit trail.
- **Report:** Pull Request Self-Approval Permitted (Medium) — Reject approvals where approver == author; require at least one independent approver.

### Pull request merged with zero approvals
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Exploitation outline:** POST /pr/2/merge and it lands in main unreviewed.
- **Impact:** Any contributor can ship unreviewed code to the client's main branch — review process fully bypassed.
- **Report:** Pull Request Merge Without Required Approvals (High) — Verify approval count and merger permissions server-side before merging.

## Issues (2)

### Stored XSS in issue title/body
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Exploitation outline:** <script>alert(1)</script> as an issue title fires for every viewer.
- **Impact:** Attackers target the client's maintainers through the tracker itself, stealing sessions from the people with most access.
- **Report:** Stored Cross-Site Scripting in Issue Tracker (High) — Escape issue content on output; adopt a strict Content-Security-Policy.

### Delete another user's issue (IDOR on issue actions)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Exploitation outline:** As bob, POST /issue/1/delete — it disappears.
- **Impact:** Attackers quietly erase the client's bug reports and audit trail, hiding defects or sabotaging the team.
- **Report:** Missing Authorization on Issue Deletion (Medium) — Only the issue author, repo owner or moderators may delete an issue; log deletions.

## Collaborators & Invites (2)

### Read-only collaborator promotes themselves to repo admin
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Exploitation outline:** As carol, POST /repo/101/collaborators setting carol to admin.
- **Impact:** The least-trusted insider becomes repo admin: can read everything, change settings, and disrupt the real owner's team.
- **Report:** Collaborator Privilege Escalation (Read → Admin) (Critical) — Only repo owners/admins may change collaborator roles; verify the caller role server-side.

### Repository invite accepted by the wrong user
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Exploitation outline:** Log in as victor and POST /invite/accept with that token — you get carol's access.
- **Impact:** A leaked or guessed invite link hands repository access to whoever finds it — outside the client's control.
- **Report:** Invitation Acceptance Not Bound to Invitee (High) — Bind invites to the invitee account/email and require that identity at acceptance.

## Tokens & API (2)

### Read-only API token performs writes (scope not enforced)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Exploitation outline:** POST /api/repo/103/file with alice's read-only token — the file is created.
- **Impact:** A leaked read-only token (the kind pasted into CI logs) becomes full write access to the client's code.
- **Report:** API Token Scope Not Enforced on Write Endpoints (High) — Check required scopes per endpoint server-side; deny by default.

### API token derivable from the username (predictable token)
- **OWASP:** A02:2021 Cryptographic Failures
- **Difficulty:** Advanced
- **Exploitation outline:** Call GET /api/me with Authorization: Bearer hxgit_<base64 of "bob"> — you are bob, no token was ever issued to you.
- **Impact:** Anyone who knows a username — public information — owns that account's full API access on the client platform.
- **Report:** Predictable API Token Derived from Username (Critical) — Issue only random, high-entropy tokens; store hashes; remove all fallback/derived token paths.

## Search (1)

### SQL injection in repository search leaks private repos
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Exploitation outline:** Search for ' OR '1'='1 and watch private repositories appear in the results.
- **Impact:** The existence, names and descriptions of a client's private projects leak to any user with a search box.
- **Report:** SQL Injection in Search Exposes Private Repositories (High) — Parameterise the search query and enforce visibility in the query itself.

## Admin Panel (1)

### Admin user-deletion performed by a simple GET (CSRF)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Exploitation outline:** As admin, GET /admin/delete-user?id=6 — the account is gone. (An attacker page could fire that URL in an admin's browser.)
- **Impact:** One malicious link visited by an admin deletes client accounts — data loss triggered by a single click.
- **Report:** State-Changing Admin Action via GET (CSRF) (High) — Make deletions POST-only with CSRF tokens, confirmation and audit logging.
