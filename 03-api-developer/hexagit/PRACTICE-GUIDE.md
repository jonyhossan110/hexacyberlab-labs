# HexaGit — Practice Guide (LAB 25)

26 challenges grouped by feature, then difficulty. Every challenge has 3 graded hints (also on the /tests mission page) and a measurable objective: the lab's progress counter only moves when the exploit actually succeeds server-side. The Lab Coach chatbot gives step-by-step help for a feature only after you have made at least 3 genuine attempts on it.

## Login & Authentication

### SQL injection login bypass (legacy auth path) — Beginner
- **OWASP:** A03:2021 Injection
- **Objective:** Make the "sqli-login" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. The login form still talks to a legacy string-built query path — it trusts what you type in the username box.
  2. Try a username that makes the WHERE clause always true.
  3. Classic: admin' OR '1'='1 as the username, any password.
- **Lesson:** String-built queries let an attacker rewrite the login logic itself and walk in as the first account in the table — usually the admin.

### Brute force — no rate limit or lockout on login — Beginner
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Objective:** Make the "brute-force" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. Pick one account and just keep guessing wrong passwords.
  2. Count how many failures the app happily processes — 5? 10? more?
  3. Submit 10 wrong passwords for alice from one session; nothing slows you down.
- **Lesson:** Without throttling or lockout, an attacker can try unlimited passwords against any account until one works.

### User enumeration via password-reset responses — Beginner
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Objective:** Make the "user-enumeration" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. The forgot-password page answers differently depending on whether the account exists.
  2. Try one real username (alice) and one invented one.
  3. Compare the two responses word for word — one confirms the account is real.
- **Lesson:** Different responses for real vs fake usernames hand attackers a verified target list for password attacks.

### Default credentials on the deploy service account — Beginner
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Objective:** Make the "default-creds" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. One account on this platform is a service account that shipped with its factory password.
  2. Its username and password are the same word.
  3. Try deploy / deploy.
- **Lesson:** Vendor and service accounts with default passwords are one of the oldest, most reliable ways into a system.

### Predictable password-reset token — Intermediate
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Objective:** Make the "reset-token-predict" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. Request a reset for your own account and study the token format.
  2. The token is built only from things an attacker knows: the user id and the current minute.
  3. Format: HXGRST-<userId>-<unix minutes>. Compute one for alice (id 2) without asking the app.
- **Lesson:** Reset tokens must be unguessable random values; anything derived from public data can be forged for any victim.

### Session/cookie role tampering opens the admin panel — Intermediate
- **OWASP:** A01:2021 Broken Access Control
- **Objective:** Make the "cookie-role-tamper" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. After login, look at every cookie the app sets — one of them repeats your role.
  2. The admin gate trusts that cookie instead of the server-side account.
  3. Set hx_role=admin in your browser, keep your normal session, then visit /admin.
- **Lesson:** Authorization data must live server-side; anything stored in a cookie can be edited by the client.

## Registration & Profile

### Weak password policy — 1-character passwords accepted — Beginner
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Objective:** Make the "weak-password" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. Register a new account and see how short a password you can get away with.
  2. There is effectively no minimum length or complexity check.
  3. A single character is accepted.
- **Lesson:** A password policy that accepts anything guarantees some accounts will have guessable passwords.

### Stored XSS in profile display name — Beginner
- **OWASP:** A03:2021 Injection
- **Objective:** Make the "stored-xss-profile" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. Your display name is shown on your public profile page and next to your work.
  2. It is rendered without escaping.
  3. Set your display name to <script>alert(1)</script> and view your profile.
- **Lesson:** Any user-controlled text rendered unescaped becomes JavaScript running in other users' browsers.

### Mass assignment — role field accepted at registration — Intermediate
- **OWASP:** A01:2021 Broken Access Control
- **Objective:** Make the "mass-assignment" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. The registration handler binds the whole request body to the new user object.
  2. Add a field the form never shows you: role.
  3. POST /register with role=admin alongside the normal fields.
- **Lesson:** Binding request data straight onto privileged objects lets attackers set fields the UI never offered them.

### CSRF on profile update (no token, no origin check) — Intermediate
- **OWASP:** A01:2021 Broken Access Control
- **Objective:** Make the "profile-csrf" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. Profile updates are a plain POST with no anti-CSRF token.
  2. The app sets an hx_origin marker cookie on its own pages — but never checks it.
  3. Submit the profile form from a context without the hx_origin cookie (e.g. curl with only your session cookie).
- **Lesson:** State-changing forms without CSRF tokens can be submitted by any website the victim visits while logged in.

## Repositories

### Private repository readable by any logged-in user (IDOR) — Beginner
- **OWASP:** A01:2021 Broken Access Control
- **Objective:** Make the "private-repo-idor" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. Repository ids are small sequential numbers — and private repos are just ids too.
  2. Log in as victor, who owns nothing and collaborates on nothing.
  3. Open /repo/102 directly. Nobody checks that it is private.
- **Lesson:** Hiding a link is not access control; every object read must verify the requester is allowed to see it.

### Stored XSS in repository description — Beginner
- **OWASP:** A03:2021 Injection
- **Objective:** Make the "stored-xss-repo" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. Repository descriptions are rendered raw on the explore page and repo home.
  2. Create or edit a repo you own and put markup in the description.
  3. Use <script>alert(1)</script> in the description and view the repo.
- **Lesson:** Descriptions, READMEs and comments are code-adjacent content — rendering them raw executes attacker scripts for every visitor.

### Repository settings changed by a non-owner — Intermediate
- **OWASP:** A01:2021 Broken Access Control
- **Objective:** Make the "repo-settings-tamper" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. The settings endpoint checks that you are logged in — not that the repo is yours.
  2. Pick a repo you do not own, e.g. alice's web-storefront (101).
  3. POST a new visibility to /repo/101/settings as bob.
- **Lesson:** Every privileged action needs an ownership/role check on the server, not just an authenticated session.

### Repository transfer executed by a non-owner (transfer hijack) — Intermediate
- **OWASP:** A01:2021 Broken Access Control
- **Objective:** Make the "repo-transfer-hijack" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. Transferring a repo should be the owner's most guarded action. Here it is a plain POST anyone logged in can call.
  2. As bob, target alice's repo 101.
  3. POST /repo/101/transfer with newOwner=bob — the repo changes hands.
- **Lesson:** Ownership-transfer flows need the strictest authorization and confirmation; a missing check hands the asset to whoever asks.

## Branches & Files

### Path traversal in raw file view exposes server config — Intermediate
- **OWASP:** A01:2021 Broken Access Control
- **Objective:** Make the "path-traversal" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. The raw file endpoint takes a path parameter and serves whatever it resolves to.
  2. Try walking up out of the repository with ../
  3. GET /repo/101/raw?path=../../app-config reads the server's internal config.
- **Lesson:** File paths from users must be normalised and confined to an allowed directory; otherwise the whole filesystem is in scope.

### Direct push to protected main branch by a non-owner — Intermediate
- **OWASP:** A01:2021 Broken Access Control
- **Objective:** Make the "protected-branch-push" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. The main branch is labelled "protected" — but the push endpoint never enforces it.
  2. Try pushing as bob (a collaborator, not the owner).
  3. POST /repo/101/push with branch=main.
- **Lesson:** Branch protection that exists only as a label does nothing; enforcement must happen on the write path itself.

## Pull Requests

### Author can approve their own pull request (self-approval) — Beginner
- **OWASP:** A01:2021 Broken Access Control
- **Objective:** Make the "pr-self-approve" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. PR #1 on web-storefront was opened by bob. Reviews are meant to be independent.
  2. The approve endpoint never asks whether you wrote the PR.
  3. Log in as bob and approve PR 1 — your own approval counts.
- **Lesson:** Review gates only work if the reviewer is independent of the author; self-approval makes the gate theatre.

### Pull request merged with zero approvals — Beginner
- **OWASP:** A01:2021 Broken Access Control
- **Objective:** Make the "pr-merge-no-approval" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. PR #2 on web-storefront has no approvals at all.
  2. The merge endpoint checks the PR exists — nothing else.
  3. POST /pr/2/merge and it lands in main unreviewed.
- **Lesson:** Merge buttons must verify the review policy (approvals, checks) on the server at merge time.

## Issues

### Stored XSS in issue title/body — Beginner
- **OWASP:** A03:2021 Injection
- **Objective:** Make the "stored-xss-issue" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. Issue text is rendered raw on the issue page.
  2. Open an issue on a repo you can access and put markup in the title.
  3. <script>alert(1)</script> as an issue title fires for every viewer.
- **Lesson:** Issue trackers are high-traffic internal pages — stored XSS there reaches maintainers and admins fast.

### Delete another user's issue (IDOR on issue actions) — Intermediate
- **OWASP:** A01:2021 Broken Access Control
- **Objective:** Make the "issue-delete-idor" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. The delete-issue endpoint trusts the id in the URL and nothing else.
  2. Issue 1 on web-storefront belongs to carol.
  3. As bob, POST /issue/1/delete — it disappears.
- **Lesson:** Destructive actions on objects need the same ownership checks as reads — often they get none.

## Collaborators & Invites

### Read-only collaborator promotes themselves to repo admin — Intermediate
- **OWASP:** A01:2021 Broken Access Control
- **Objective:** Make the "collab-priv-esc" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. carol has read-only access to web-storefront — the lowest rung.
  2. The collaborator-management endpoint never checks the CALLER's role.
  3. As carol, POST /repo/101/collaborators setting carol to admin.
- **Lesson:** Privilege-management endpoints must verify the caller's privilege, not just that a session exists.

### Repository invite accepted by the wrong user — Intermediate
- **OWASP:** A01:2021 Broken Access Control
- **Objective:** Make the "invite-wrong-user" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. There is a pending invite to ml-toolkit addressed to carol, token inv-ml-7f3a (visible on the invites page).
  2. Accepting it never checks that YOU are carol.
  3. Log in as victor and POST /invite/accept with that token — you get carol's access.
- **Lesson:** Invite tokens must be bound to the invited identity and verified at acceptance.

## Tokens & API

### Read-only API token performs writes (scope not enforced) — Intermediate
- **OWASP:** A01:2021 Broken Access Control
- **Objective:** Make the "token-scope-abuse" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. alice's API token is labelled read-only (see the Tokens page).
  2. The API write endpoint authenticates the token but never checks its scopes.
  3. POST /api/repo/103/file with alice's read-only token — the file is created.
- **Lesson:** Token scopes are a security boundary only if every endpoint enforces them on every request.

### API token derivable from the username (predictable token) — Advanced
- **OWASP:** A02:2021 Cryptographic Failures
- **Objective:** Make the "weak-api-token" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. Besides issued tokens, the API quietly accepts a fallback token format.
  2. It is just a prefix plus the base64 of the username.
  3. Call GET /api/me with Authorization: Bearer hxgit_<base64 of "bob"> — you are bob, no token was ever issued to you.
- **Lesson:** Authentication secrets must be high-entropy and server-issued; anything derivable from public data is not a secret.

## Search

### SQL injection in repository search leaks private repos — Intermediate
- **OWASP:** A03:2021 Injection
- **Objective:** Make the "search-sqli" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. Search builds its query by gluing your text into a WHERE clause over all repos, filtering later.
  2. A classic always-true condition makes the filter meaningless.
  3. Search for ' OR '1'='1 and watch private repositories appear in the results.
- **Lesson:** Filtering results after an injectable query is not protection — the injection decides what comes back.

## Admin Panel

### Admin user-deletion performed by a simple GET (CSRF) — Intermediate
- **OWASP:** A01:2021 Broken Access Control
- **Objective:** Make the "admin-action-csrf" test flip to done on /tests by performing the exploit end-to-end.
- **Hints:**
  1. Deleting a user is a state-changing, destructive admin action.
  2. Here it is a plain GET link with no token and no confirmation.
  3. As admin, GET /admin/delete-user?id=6 — the account is gone. (An attacker page could fire that URL in an admin's browser.)
- **Lesson:** State changes must never ride on GET; destructive admin actions need POST + CSRF token + confirmation.
