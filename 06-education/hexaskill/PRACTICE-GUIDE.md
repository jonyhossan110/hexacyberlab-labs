# HexaSkill (LAB 58) — Practice Guide

Challenges grouped by feature, then difficulty. Each challenge lists its 3 graded hints and a measurable
objective: the test flips to DONE on `/tests` only when the exploit effect really happens on the server.
Stuck? After 3 genuine attempts on a feature, the Lab Coach will guide you step by step.

## Login & Authentication

### [Beginner] SQL injection login bypass
- **Objective:** Make the "SQL injection login bypass" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: The login form builds its account lookup by gluing your input into a query string.
- Hint 2: Try a classic tautology in the email field, e.g. something with ' OR '1'='1 in it.
- Hint 3: Submit email: ' OR '1'='1 and any password — the string-built query matches the first account (the admin).

### [Beginner] Brute force — no rate limit or lockout
- **Objective:** Make the "Brute force — no rate limit or lockout" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Pick one real account and keep guessing its password.
- Hint 2: Notice the login never slows down, CAPTCHAs you, or locks the account.
- Hint 3: Send 10 or more wrong passwords for alice@hexaskill.local — the 10th failure is still processed normally.

### [Beginner] User enumeration via differing error messages
- **Objective:** Make the "User enumeration via differing error messages" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Compare the login error for an email that does not exist with the error for a real email with a wrong password.
- Hint 2: The two failures say different things — one confirms the account exists.
- Hint 3: Try nobody@hexaskill.local (says: no account) then alice@hexaskill.local with a wrong password (says: incorrect password). You have confirmed a real user.

### [Beginner] Published demo account with default credentials
- **Objective:** Make the "Published demo account with default credentials" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Read the login page itself — it advertises a way in.
- Hint 2: A demo account is published right on the sign-in form.
- Hint 3: Sign in with the demo credentials shown on the login page (demo@hexaskill.local).

### [Intermediate] Predictable password-reset token
- **Objective:** Make the "Predictable password-reset token" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Request a password reset and study the token format in the reset link.
- Hint 2: The token is built from something public about the account — its numeric id.
- Hint 3: Token = HXSK<id>-<base36(id*131+17)>. Compute it for carol (id 5) and reset her password without ever requesting a reset.

### [Intermediate] Session role cookie trusted by the server
- **Objective:** Make the "Session role cookie trusted by the server" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: After logging in, inspect the cookies the app sets — one of them describes your role.
- Hint 2: The server believes that cookie instead of checking the account record.
- Hint 3: Set the hx_role cookie to admin and visit /admin as a plain learner.

## Registration & Profile

### [Beginner] Weak password policy on registration
- **Objective:** Make the "Weak password policy on registration" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Register a new account and shrink the password.
- Hint 2: There is no minimum length or complexity check at all.
- Hint 3: Register with the single-character password "x" — the account is created.

### [Beginner] Stored XSS in display name
- **Objective:** Make the "Stored XSS in display name" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Your display name is shown back on team and admin pages.
- Hint 2: Names are rendered without escaping — markup survives.
- Hint 3: Register or rename yourself to <script>alert(1)</script> and view a team report or the admin user list.

### [Intermediate] Mass assignment — role set at registration
- **Objective:** Make the "Mass assignment — role set at registration" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: The register form only shows name, email and password — but the server binds more fields than it shows.
- Hint 2: Add a field the form never offered and see if the account record keeps it.
- Hint 3: POST /register with an extra field role=assessor (or admin) — your new account really holds that role.

### [Intermediate] CSRF on profile update
- **Objective:** Make the "CSRF on profile update" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Profile changes are a plain POST with no anti-CSRF token.
- Hint 2: The app never checks where the request came from.
- Hint 3: While logged in, POST /profile/update with an Origin header of https://evil.example — the change is accepted.

## Skill Paths

### [Beginner] Path order not enforced — final module first
- **Objective:** Make the "Path order not enforced — final module first" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Paths present modules in order — but does the completion endpoint check?
- Hint 2: Try completing a later module directly, before touching the earlier ones.
- Hint 3: As a fresh learner, POST /module/4/complete (the final module of Path 1) — it is marked complete immediately.

### [Beginner] IDOR — any learner progress record readable
- **Objective:** Make the "IDOR — any learner progress record readable" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: The progress API takes a user id in the URL.
- Hint 2: It never checks the id belongs to you.
- Hint 3: GET /api/users/3/progress while signed in as someone else — full module progress comes back.

### [Beginner] Premium path content served without entitlement
- **Objective:** Make the "Premium path content served without entitlement" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Path 2 is sold as premium. The paywall may only exist in the marketing copy.
- Hint 2: Open a premium module page directly as a free account.
- Hint 3: GET /module/5 as a learner with no premium entitlement — the full premium content is served.

## Assessments

### [Beginner] Assessment answer key exposed via API
- **Objective:** Make the "Assessment answer key exposed via API" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: APIs built for the assessor UI sometimes ship more than the UI shows.
- Hint 2: Look for an answers endpoint under /api/assess/.
- Hint 3: GET /api/assess/1/answers as any learner — the full correct-answer key is returned.

### [Intermediate] Assessment score trusted from the client
- **Objective:** Make the "Assessment score trusted from the client" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Submit an assessment and watch what fields the server accepts.
- Hint 2: The grader computes a score — unless you hand it one.
- Hint 3: POST /assess/1 with deliberately wrong answers plus an extra field score=100 — the stored score is 100.

### [Intermediate] Learner can change grades via the assessor endpoint
- **Objective:** Make the "Learner can change grades via the assessor endpoint" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Assessors adjust grades through POST /assess/grade. Who is allowed to call it?
- Hint 2: The endpoint forgets to ask.
- Hint 3: As a plain learner, POST /assess/grade with a submission id and a new score — the grade changes.

## Badges

### [Beginner] Badge self-award without completing the path
- **Objective:** Make the "Badge self-award without completing the path" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Badges are supposed to be minted when a path is finished. Is there another door?
- Hint 2: The award endpoint trusts the request, not the progress record.
- Hint 3: As a learner who completed nothing, POST /badges/award with pathId=1 — a badge is minted for you.

### [Intermediate] Badge verification page trusts a client-supplied name
- **Objective:** Make the "Badge verification page trusts a client-supplied name" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Employers check badges on the public /verify page.
- Hint 2: The page lets the URL restyle who the badge belongs to.
- Hint 3: Open /verify/<a real badge code>?name=Anyone You Like — the page certifies that name instead of the real owner.

### [Intermediate] Any user can delete another user badge
- **Objective:** Make the "Any user can delete another user badge" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Badge deletion checks that you are signed in — and nothing else.
- Hint 2: Ownership is never compared.
- Hint 3: POST /badges/<id>/delete for a badge that belongs to someone else — it is gone.

## Portfolios

### [Beginner] Private portfolio readable by IDOR
- **Objective:** Make the "Private portfolio readable by IDOR" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Portfolios have a private setting. Settings only work if the server enforces them.
- Hint 2: Bob's portfolio is private — try reading it as Alice.
- Hint 3: GET /portfolio/4 while signed in as Alice — Bob private portfolio is served in full.

### [Intermediate] Unrestricted upload — HTML file served from the app origin
- **Objective:** Make the "Unrestricted upload — HTML file served from the app origin" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Portfolio projects accept file uploads of any kind.
- Hint 2: What Content-Type does the file come back with?
- Hint 3: Upload a file named evil.html containing a <script> payload, then open /files/evil.html — it is served as text/html from the app origin.

## Teams

### [Beginner] Other company team report readable (IDOR)
- **Objective:** Make the "Other company team report readable (IDOR)" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Team reports summarise every member progress.
- Hint 2: The report URL takes a team id — try a team you do not belong to.
- Hint 3: GET /team/2/report as Alice (Team 1) — Globex full training report is served.

### [Intermediate] Plain team member performs team-lead actions
- **Objective:** Make the "Plain team member performs team-lead actions" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Teams have leads and members. The remove-member action is meant for leads.
- Hint 2: The endpoint only checks that you are in the team.
- Hint 3: As Bob (a plain member of Team 1), POST /team/1/remove with the lead user id — the lead is removed.

## Admin Panel

### [Beginner] Admin learner export open to any signed-in user
- **Objective:** Make the "Admin learner export open to any signed-in user" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: The admin console has a CSV export of every learner.
- Hint 2: The export endpoint lives under /admin/ — but does it check the role itself?
- Hint 3: As a plain learner, GET /admin/export — the full learner list downloads.

## Platform & API

### [Beginner] Debug endpoint dumps all accounts and passwords
- **Objective:** Make the "Debug endpoint dumps all accounts and passwords" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: Development helpers have a habit of surviving into production.
- Hint 2: Try /api/debug with no login at all.
- Hint 3: GET /api/debug — every account, including plaintext passwords, is returned.

### [Intermediate] API token is a predictable function of the email
- **Objective:** Make the "API token is a predictable function of the email" test flip to DONE on `/tests` by producing its real effect server-side.
- Hint 1: The API accepts a Bearer token instead of a session.
- Hint 2: Tokens are derived from something public about the account.
- Hint 3: Forge the token for alice@hexaskill.local: 'sk_' + base64(email), then GET /api/me with no session cookie.
