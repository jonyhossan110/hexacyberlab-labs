# HexaSkill (LAB 58) — Vulnerability Map

The complete test registry for this lab: **26 tests across 9 features**.
Every entry is a real, working flaw in the app, detected server-side when the exploit actually succeeds.

## Login & Authentication (6)

### SQL injection login bypass
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **What it is:** String-built queries let attacker input change the meaning of the query itself; parameterised queries make input data-only.
- **Exploitation outline:** Submit email: ' OR '1'='1 and any password — the string-built query matches the first account (the admin).
- **Client impact:** On a client training platform this means anyone can sign in as the administrator without a password — every learner record, badge and team report is exposed.

### Brute force — no rate limit or lockout
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **What it is:** Without throttling, online password guessing is free and unlimited; rate limits and lockouts raise the cost to impractical levels.
- **Exploitation outline:** Send 10 or more wrong passwords for alice@hexaskill.local — the 10th failure is still processed normally.
- **Client impact:** Attackers can grind through password lists against client accounts at full speed until one works — weak passwords fall in minutes.

### User enumeration via differing error messages
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **What it is:** Authentication endpoints must answer identically whether or not the account exists, or they become a free directory of valid users.
- **Exploitation outline:** Try nobody@hexaskill.local (says: no account) then alice@hexaskill.local with a wrong password (says: incorrect password). You have confirmed a real user.
- **Client impact:** Attackers first harvest the list of real client accounts, then focus password attacks only where they will pay off.

### Published demo account with default credentials
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **What it is:** Demo/default accounts shipped to production are standing invitations; if they exist they need unique strong passwords and expiry.
- **Exploitation outline:** Sign in with the demo credentials shown on the login page (demo@hexaskill.local).
- **Client impact:** Anyone on the internet can walk into the client platform with the printed demo login and explore from inside a real account.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Intermediate
- **What it is:** Reset tokens must be long, random and single-use; anything derivable from public data is equivalent to no token at all.
- **Exploitation outline:** Token = HXSK<id>-<base36(id*131+17)>. Compute it for carol (id 5) and reset her password without ever requesting a reset.
- **Client impact:** An attacker who knows a victim email and id can take over the account in seconds — no inbox access needed.

### Session role cookie trusted by the server
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Authorisation data must live server-side; anything the client can edit — cookies included — is attacker-controlled.
- **Exploitation outline:** Set the hx_role cookie to admin and visit /admin as a plain learner.
- **Client impact:** Every learner can promote themselves to administrator by editing a cookie, unlocking user exports and platform settings.

## Registration & Profile (4)

### Weak password policy on registration
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **What it is:** A password policy is the floor under every account; without one, users pick passwords that fall to the first guessing attempt.
- **Exploitation outline:** Register with the single-character password "x" — the account is created.
- **Client impact:** Client learners end up with one-character passwords, so a single leaked or guessed credential hands over their training records and badges.

### Mass assignment — role set at registration
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Servers must whitelist bindable fields per endpoint; binding the whole request body lets clients write privileged fields.
- **Exploitation outline:** POST /register with an extra field role=assessor (or admin) — your new account really holds that role.
- **Client impact:** Anyone can self-register as an assessor or admin, grade their own work and award badges — the platform integrity is gone.

### Stored XSS in display name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **What it is:** Every user-controlled string must be output-encoded at render time; stored payloads fire in other users browsers, including admins.
- **Exploitation outline:** Register or rename yourself to <script>alert(1)</script> and view a team report or the admin user list.
- **Client impact:** An attacker plants a script in their profile name; when a client admin opens the user list, the script runs with the admin session.

### CSRF on profile update
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** State-changing requests need an unguessable token (or strict same-site checks); cookies alone will ride along on forged requests.
- **Exploitation outline:** While logged in, POST /profile/update with an Origin header of https://evil.example — the change is accepted.
- **Client impact:** A malicious page a learner visits can silently rewrite their profile — and the same pattern on admin actions deletes users.

## Skill Paths (3)

### Path order not enforced — final module first
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Workflow order is a business rule and must be enforced server-side on every transition, not just suggested by the UI.
- **Exploitation outline:** As a fresh learner, POST /module/4/complete (the final module of Path 1) — it is marked complete immediately.
- **Client impact:** Learners skip straight to the final module and earn certificates for training they never did — the credential the client sells becomes worthless.

### IDOR — any learner progress record readable
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Every object access must check ownership server-side; hiding a link is not authorisation.
- **Exploitation outline:** GET /api/users/3/progress while signed in as someone else — full module progress comes back.
- **Client impact:** Competitors and other learners can pull the training progress of every employee at a client company — a privacy and commercial leak.

### Premium path content served without entitlement
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Entitlement checks belong on the server for every protected resource; a hidden link or greyed-out menu is not a paywall.
- **Exploitation outline:** GET /module/5 as a learner with no premium entitlement — the full premium content is served.
- **Client impact:** The client paid course library is free to anyone with a free account — direct revenue loss.

## Assessments (3)

### Assessment score trusted from the client
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Scores, prices and totals must always be computed server-side from trusted data; a client-supplied result is a claim, not a fact.
- **Exploitation outline:** POST /assess/1 with deliberately wrong answers plus an extra field score=100 — the stored score is 100.
- **Client impact:** Learners award themselves perfect scores, so client certificates stop meaning anything and honest learners are devalued.

### Learner can change grades via the assessor endpoint
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Role checks must be enforced on the endpoint itself, for every request — not assumed from which UI linked to it.
- **Exploitation outline:** As a plain learner, POST /assess/grade with a submission id and a new score — the grade changes.
- **Client impact:** Any learner can rewrite any grade in the system, including other learners results — total loss of assessment integrity.

### Assessment answer key exposed via API
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Never send answer keys, solutions or grading data to the client; anything delivered can be read.
- **Exploitation outline:** GET /api/assess/1/answers as any learner — the full correct-answer key is returned.
- **Client impact:** The whole cohort shares the leaked answer key — every assessment on the client platform becomes a formality.

## Badges (3)

### Badge self-award without completing the path
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Reward/credential issuance must be driven by verified server-side state, never by a direct client request.
- **Exploitation outline:** As a learner who completed nothing, POST /badges/award with pathId=1 — a badge is minted for you.
- **Client impact:** Anyone can mint themselves the client completion badge and present it to employers — the credential brand is destroyed.

### Badge verification page trusts a client-supplied name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **What it is:** Verification pages must render only server-held facts; every displayed field taken from the request makes the proof forgeable.
- **Exploitation outline:** Open /verify/<a real badge code>?name=Anyone You Like — the page certifies that name instead of the real owner.
- **Client impact:** Anyone can show an employer a verification page naming themselves for a badge they never earned — the client verification system lies on demand.

### Any user can delete another user badge
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Destructive actions need ownership (or admin) checks on the server for every single request.
- **Exploitation outline:** POST /badges/<id>/delete for a badge that belongs to someone else — it is gone.
- **Client impact:** A malicious learner can wipe competitors earned badges, and the client has no audit trail to restore them.

## Portfolios (2)

### Private portfolio readable by IDOR
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Privacy flags are access-control decisions and must be enforced on every read, not just used to hide links.
- **Exploitation outline:** GET /portfolio/4 while signed in as Alice — Bob private portfolio is served in full.
- **Client impact:** Learners private project work, notes and personal details leak to every other account on the client platform.

### Unrestricted upload — HTML file served from the app origin
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **What it is:** Uploads need type allowlists, safe storage and non-executable serving; an HTML file served from your origin is stored XSS with your brand on it.
- **Exploitation outline:** Upload a file named evil.html containing a <script> payload, then open /files/evil.html — it is served as text/html from the app origin.
- **Client impact:** Attackers host phishing and script payloads on the client own domain, abusing its reputation and user sessions.

## Teams (2)

### Plain team member performs team-lead actions
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Roles inside a group are still authorisation boundaries; membership is not management.
- **Exploitation outline:** As Bob (a plain member of Team 1), POST /team/1/remove with the lead user id — the lead is removed.
- **Client impact:** Any employee in a client company team can remove the team lead and sabotage the company training programme.

### Other company team report readable (IDOR)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Tenant boundaries must be checked on every request; predictable ids make cross-company leaks one guess away.
- **Exploitation outline:** GET /team/2/report as Alice (Team 1) — Globex full training report is served.
- **Client impact:** One client company can read another company employee training performance — a serious B2B confidentiality breach.

## Admin Panel (1)

### Admin learner export open to any signed-in user
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Every privileged endpoint must verify the role itself; being linked only from an admin page is not protection.
- **Exploitation outline:** As a plain learner, GET /admin/export — the full learner list downloads.
- **Client impact:** Any learner can download the client entire user base — emails and roles — for phishing or resale.

## Platform & API (2)

### Debug endpoint dumps all accounts and passwords
- **OWASP:** A05:2021 Security Misconfiguration
- **Difficulty:** Beginner
- **What it is:** Debug/diagnostic endpoints must never ship to production; one leftover route can hand over the entire credential store.
- **Exploitation outline:** GET /api/debug — every account, including plaintext passwords, is returned.
- **Client impact:** Full account takeover of every learner, assessor and admin — the worst single finding a client platform can have.

### API token is a predictable function of the email
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Intermediate
- **What it is:** API tokens must be random secrets issued server-side; a token anyone can compute from an email is not authentication.
- **Exploitation outline:** Forge the token for alice@hexaskill.local: 'sk_' + base64(email), then GET /api/me with no session cookie.
- **Client impact:** Anyone who knows a user email — public information — gets full API access to that account.
