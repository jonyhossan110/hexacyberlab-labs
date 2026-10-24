# HexaDeploy — Practice Guide (LAB 24)

26 challenges across 9 features. Work feature by feature; the in-app 🎯 Tests page mirrors this list and tracks your attempts. After 3 genuine attempts on a feature, the Lab Coach will guide you step by step.

## Login & Authentication

### SQL Injection — Login Bypass (Beginner · A03 Injection)
- **Objective:** make the "sqli-login" test flip to done on /tests by performing the real exploit.
- Hint 1: The login form builds its query by gluing your input straight into the SQL string.
- Hint 2: A classic tautology in the email field can make the WHERE clause true for the first row in the table.
- Hint 3: Try email: ' OR '1'='1' --  with any password — you land in the first account, which is the platform admin.
- **Walkthrough (coach text):** Step by step: 1) Open /login. 2) In the email field enter: ' OR '1'='1' --  3) Enter any password and submit. 4) You are logged in as the first user in the table (the platform admin) because the query became: email='' OR '1'='1' — always true.
- **Lesson:** String-built SQL queries let an attacker rewrite the login check itself. Parameterised queries remove the whole class.

### Brute Force — No Rate Limiting on Login (Beginner · A07 Auth Failures)
- **Objective:** make the "brute-force" test flip to done on /tests by performing the real exploit.
- Hint 1: Nothing slows you down: no lockout, no CAPTCHA, no delay.
- Hint 2: Write a loop (or use Burp Intruder) and fire wrong passwords at one account.
- Hint 3: After 10 failed attempts the app is still happily processing guesses — that missing throttle is the finding.
- **Walkthrough (coach text):** Step by step: 1) Pick an account, e.g. qa@hexadeploy.local. 2) Submit a wrong password 10 times (curl loop or Intruder). 3) Every attempt is processed at full speed — no block, no delay. 4) The test passes at the 10th accepted failure.
- **Lesson:** Without throttling or lockout, online password guessing is cheap and quiet. Rate limits + lockout + MFA are the standard defence.

### User Enumeration via Login & Reset Responses (Beginner · A07 Auth Failures)
- **Objective:** make the "user-enumeration" test flip to done on /tests by performing the real exploit.
- Hint 1: Compare the error for an email that exists with one that does not.
- Hint 2: The login form and the forgot-password form answer differently depending on whether the account is real.
- Hint 3: Probe one real address (from the README) and one invented address in the same session — the difference is the oracle.
- **Walkthrough (coach text):** Step by step: 1) In one session, submit /login with an invented email — note "No account found for that email." 2) Submit a real email with a wrong password — note the different message "Incorrect password…". 3) /forgot behaves the same way. The test passes once one session has seen both answers.
- **Lesson:** Different responses for "no such user" vs "wrong password" hand attackers a free list of valid accounts to target.

### Default / Demo Credentials Still Active (Beginner · A07 Auth Failures)
- **Objective:** make the "default-creds" test flip to done on /tests by performing the real exploit.
- Hint 1: Seeded/demo accounts are a classic leftover in production SaaS.
- Hint 2: The README’s test-account table includes a demo login — check whether it still works.
- Hint 3: demo@hexadeploy.local with its documented demo password is still an active account.
- **Walkthrough (coach text):** Step by step: 1) Open /login. 2) Sign in as demo@hexadeploy.local / demo123. 3) The account is fully active — that successful login is the finding.
- **Lesson:** Demo and default accounts shipped to production are pre-made doors: their passwords are public knowledge.

### Predictable Password-Reset Token (Intermediate · A07 Auth Failures)
- **Objective:** make the "reset-token" test flip to done on /tests by performing the real exploit.
- Hint 1: Ask for a reset for your own account and study the token format (the flow is intentionally transparent in this lab).
- Hint 2: The token is built only from the user’s numeric ID and the current minute — nothing random.
- Hint 3: Compute rst-<victim id>-<current minute> for the admin (id 1) and post it straight to /reset without ever requesting a reset for that account.
- **Walkthrough (coach text):** Step by step: 1) Note the token format: rst-<userId>-<epoch minute>. 2) In a fresh session (never use /forgot for the victim), compute the token for the victim’s ID with the current minute. 3) POST /reset with their email, your computed token and a new password. 4) The reset succeeds — you forged it. The test passes because the token was never issued to your session.
- **Lesson:** Reset tokens must be long, random and single-use. A token derived from public values (ID + time) can be forged for any account.

### Session/Role Cookie Tampering (Intermediate · A01 Broken Access Control)
- **Objective:** make the "cookie-tamper" test flip to done on /tests by performing the real exploit.
- Hint 1: After login, look at the cookies the app sets — one of them carries your platform role.
- Hint 2: That role cookie is trusted by the admin gate without any server-side check or signature.
- Hint 3: Set hx_role=admin in your browser (or curl) while logged in as a normal user and open /admin.
- **Walkthrough (coach text):** Step by step: 1) Log in as any normal user (e.g. victor). 2) In your browser’s cookie editor (or with curl -b) set the cookie hx_role to admin. 3) Open /admin. 4) The admin panel opens because the gate reads the cookie, not the account — the test passes when a non-admin reaches /admin this way.
- **Lesson:** Authorisation data must live server-side. A role stored in an unsigned client cookie is a suggestion the user can edit.

## Registration & Profile

### Weak Password Policy (1-Character Passwords) (Beginner · A07 Auth Failures)
- **Objective:** make the "weak-password" test flip to done on /tests by performing the real exploit.
- Hint 1: The registration form accepts almost anything as a password.
- Hint 2: Try registering with a password of a single character.
- Hint 3: No length, complexity or breach-list check stops you — the account is created.
- **Walkthrough (coach text):** Step by step: 1) Open /register. 2) Create an account with the password "x" (one character). 3) The account is created and works — the test passes.
- **Lesson:** A password policy is the cheapest control there is; accepting 1-character passwords invites credential stuffing and guessing.

### Mass Assignment — Self-Assigning the Admin Role (Intermediate · A01 Broken Access Control)
- **Objective:** make the "mass-assignment" test flip to done on /tests by performing the real exploit.
- Hint 1: The server binds the whole submitted form to the new account object — including fields the form never shows.
- Hint 2: Add a field the UI doesn’t offer, e.g. role, to the register or profile request.
- Hint 3: Register with role=admin added to the POST body (curl or Burp) — the new account is created as a platform admin.
- **Walkthrough (coach text):** Step by step: 1) Intercept or curl the /register POST. 2) Add the extra field role=admin to the body. 3) Submit — the account is created with the platform admin role (check the Admin link). 4) The same trick works via POST /profile. The test passes when the injected role takes effect.
- **Lesson:** Frameworks that auto-bind request fields to models let attackers set privileged attributes (role, balance, tier) they were never shown.

### Stored XSS via Display Name (Beginner · A03 Injection)
- **Objective:** make the "stored-xss-name" test flip to done on /tests by performing the real exploit.
- Hint 1: Your display name is shown all over the app — team lists, deploy history, build records.
- Hint 2: It is rendered without encoding.
- Hint 3: Register or set your profile name to <script>alert(1)</script> — it is stored as-is and fires for everyone who sees it.
- **Walkthrough (coach text):** Step by step: 1) Register a new account (or edit your profile) with the name: <script>alert(1)</script> 2) Submit. 3) The payload is stored verbatim and rendered raw wherever the name appears — the test passes at store time.
- **Lesson:** Any stored field rendered without output encoding becomes a persistent script delivery mechanism aimed at other users — including admins.

### CSRF on Profile Update (Intermediate · A01 Broken Access Control)
- **Objective:** make the "profile-csrf" test flip to done on /tests by performing the real exploit.
- Hint 1: The profile form carries a token field (hx_tok) — but check whether the server actually verifies it.
- Hint 2: Send the profile POST from a different origin, or strip the token entirely.
- Hint 3: curl the /profile POST with an Origin: https://evil.example header and no hx_tok — the change is accepted anyway.
- **Walkthrough (coach text):** Step by step: 1) Log in as any user and note your cookie. 2) From curl, POST /profile with a new name, your session cookie, an Origin: https://evil.example header and NO hx_tok field. 3) The name changes — the request was accepted cross-site. The test passes when a state change lands without a valid token.
- **Lesson:** A CSRF token that is rendered but never verified is decoration. State-changing requests must validate the token (or SameSite + origin checks) server-side.

## Projects

### Cross-Project IDOR — Reading Another Team’s Project (Beginner · A01 Broken Access Control)
- **Objective:** make the "project-idor" test flip to done on /tests by performing the real exploit.
- Hint 1: Project URLs carry a simple numeric ID.
- Hint 2: Your project list only shows your projects — but the detail page never checks membership.
- Hint 3: Log in as victor and open /projects/3’s neighbours: /projects/1 — a project you do not belong to renders in full.
- **Walkthrough (coach text):** Step by step: 1) Log in as victor@hexadeploy.local (owner of DataSync Worker only). 2) Open /projects/1. 3) Nebula Storefront renders in full — members, environments, builds, deploys — although you are not a member. The test passes when a non-member is served the project.
- **Lesson:** Hiding an object from lists is not access control. Every object fetch must check the caller’s right to that object.

### Search Leaks Other Projects’ Environments & Builds (Beginner · A01 Broken Access Control)
- **Objective:** make the "search-disclosure" test flip to done on /tests by performing the real exploit.
- Hint 1: The global search box searches everything — try searching for an environment name like "production".
- Hint 2: Results are not scoped to the projects you belong to.
- Hint 3: As victor, search "production" — environments and builds from Nebula Storefront and Cloudcart API appear, with links.
- **Walkthrough (coach text):** Step by step: 1) Log in as victor. 2) Open /search?q=production. 3) Environments and builds belonging to projects you are not a member of are listed. The test passes when a result from a foreign project is served to you.
- **Lesson:** Search is a data-access path like any other: if it is not scoped by the caller’s permissions, it becomes a catalogue of everything private.

## Builds & Pipelines

### Build Log IDOR — Reading Another Project’s Build Logs (Beginner · A01 Broken Access Control)
- **Objective:** make the "build-idor" test flip to done on /tests by performing the real exploit.
- Hint 1: Build logs have their own URLs with simple numeric IDs: /builds/<id>/log.
- Hint 2: The log endpoint never asks which project the build belongs to, or whether you are on it.
- Hint 3: As victor, open /builds/2/log — the Nebula Storefront production build log.
- **Walkthrough (coach text):** Step by step: 1) Log in as victor (not a member of Nebula Storefront). 2) Open /builds/2/log. 3) The other project’s build log is served in full. The test passes when a non-member reads the log.
- **Lesson:** Every artefact of the pipeline — logs included — needs the same ownership check as the project itself.

### Production Secrets Printed in Build Logs (Intermediate · A09 Logging Failures)
- **Objective:** make the "secret-in-build-log" test flip to done on /tests by performing the real exploit.
- Hint 1: One of the seeded production builds ran a debug step that dumped the whole environment.
- Hint 2: Open the production build log for Nebula Storefront (build 2) as someone without production rights — e.g. sara, a mere viewer.
- Hint 3: The log prints DB_PASSWORD and STRIPE_SECRET_KEY in clear text — the pipeline leaked its own crown jewels.
- **Walkthrough (coach text):** Step by step: 1) Log in as sara@hexadeploy.local (viewer on Nebula Storefront — no production rights). 2) Open /builds/2/log. 3) The log contains the real production values (DB_PASSWORD, STRIPE_SECRET_KEY) because the build printed its environment. The test passes when a user without production access is served a log containing a production secret.
- **Lesson:** CI/CD logs must never contain secret values: mask variables, forbid env dumps, and treat logs as sensitive data with restricted access and retention.

### Build-Log Injection via Version String (Advanced · A03 Injection)
- **Objective:** make the "build-log-injection" test flip to done on /tests by performing the real exploit.
- Hint 1: The "trigger build" form takes a free-text version string — and writes it straight into the build log.
- Hint 2: What happens if the version contains a newline, or a shell-looking fragment like $(printenv)?
- Hint 3: Trigger a build with the version: v9.9.9$(printenv) — the simulated pipeline "executes" it and the log suddenly contains a full environment dump.
- **Walkthrough (coach text):** Step by step: 1) Log in as any project member (e.g. dev@). 2) In the Trigger build form, set the version to: v9.9.9$(printenv) 3) Submit and open the new build’s log. 4) The log shows a forged environment dump — your input was treated as a command. The test passes when the injected build is created.
- **Lesson:** User input that reaches logs or shell-like steps must be treated as code: validate formats (semver), never interpolate raw input into commands or log templates.

## Environments & Secrets

### Environment IDOR — Reading Another Project’s Production Secrets (Beginner · A01 Broken Access Control)
- **Objective:** make the "env-idor" test flip to done on /tests by performing the real exploit.
- Hint 1: Environment pages have simple numeric URLs: /envs/<id>.
- Hint 2: The page shows the environment’s variables in full — and never checks which project they belong to.
- Hint 3: As victor, open /envs/3 — Nebula Storefront’s production variables, including the live DB password and Stripe key.
- **Walkthrough (coach text):** Step by step: 1) Log in as victor. 2) Open /envs/3. 3) The production environment of a project you do not belong to renders with every variable in clear text. The test passes when a non-member is served the environment.
- **Lesson:** Secrets stores are the highest-value pages in a deployment platform; they need the strictest per-object authorisation, not the weakest.

### Secret Variable Tampering by a Read-Only Viewer (Intermediate · A01 Broken Access Control)
- **Objective:** make the "secret-tamper" test flip to done on /tests by performing the real exploit.
- Hint 1: The environment page has an "update variables" form. Who is it shown to — and who does the server actually check?
- Hint 2: A project viewer should be read-only. The update endpoint never verifies a production role.
- Hint 3: As sara (viewer on Nebula Storefront), POST a changed variable to /envs/3/update — production accepts it.
- **Walkthrough (coach text):** Step by step: 1) Log in as sara@hexadeploy.local (viewer). 2) Open /envs/3 and use the Update variables form — or curl POST /envs/3/update with vars=API_URL=https://evil.example 3) The production variable is changed. The test passes when a user without production rights modifies a production environment.
- **Lesson:** Production secret changes must require an explicit production role server-side, be audited, and ideally need a second pair of eyes.

### Viewer Creates a Production Environment (Intermediate · A01 Broken Access Control)
- **Objective:** make the "env-create-prod" test flip to done on /tests by performing the real exploit.
- Hint 1: The project page lets members add environments and choose the kind — development, staging, or production.
- Hint 2: Environment creation is a privileged pipeline action, but the server checks nothing beyond being logged in.
- Hint 3: As sara (viewer), create an environment on Nebula Storefront with kind=production and your own variables.
- **Walkthrough (coach text):** Step by step: 1) Log in as sara (viewer on Nebula Storefront). 2) On /projects/1, use the Add environment form with name=prod-backup and kind=production. 3) The environment is created. The test passes because a non-owner created a production environment.
- **Lesson:** Creating a production target is a privileged act: restrict it to owners, and treat new environments as security-sensitive configuration.

## Deployments & Rollback

### Deploy to Production Without the Production Role (Intermediate · A01 Broken Access Control)
- **Objective:** make the "prod-deploy-role" test flip to done on /tests by performing the real exploit.
- Hint 1: The deploy form lets you pick any environment of the project — including production.
- Hint 2: Only owners and developers should ship to production. Does the server check your project role?
- Hint 3: As sara (viewer), deploy build 1 to the production environment (env 3) of Nebula Storefront.
- **Walkthrough (coach text):** Step by step: 1) Log in as sara (viewer). 2) On /projects/1, use the Deploy form: environment=production (3), build=1. 3) Submit — the deploy is recorded as live in production. The test passes when a user without production rights deploys to a production environment.
- **Lesson:** The deploy action is the moment code becomes production: its authorisation check must be server-side, role-based, and per-environment.

### Rollback Abuse — Reverting Production Without Rights (Intermediate · A01 Broken Access Control)
- **Objective:** make the "rollback-abuse" test flip to done on /tests by performing the real exploit.
- Hint 1: Every deploy in the history has a Roll back button.
- Hint 2: Rolling back production is as powerful as deploying — it changes what customers are served.
- Hint 3: As sara (viewer), roll back the live production deploy (deploy 2) on Nebula Storefront.
- **Walkthrough (coach text):** Step by step: 1) Log in as sara (viewer). 2) On /projects/1, find deploy 2 (the live production deploy) and click Roll back — or curl POST /deploys/2/rollback. 3) Production is reverted by a read-only account. The test passes on that state change.
- **Lesson:** Rollback is a production write and needs the same authorisation, audit and notification as a deploy.

## Team & Roles

### Team Role Escalation — Non-Owner Rewrites Project Roles (Intermediate · A01 Broken Access Control)
- **Objective:** make the "role-escalation" test flip to done on /tests by performing the real exploit.
- Hint 1: The Team table on the project page has a role dropdown and a Set role button for every member.
- Hint 2: Managing roles should be owner-only work. The endpoint never checks who is asking.
- Hint 3: As nadia (developer) or sara (viewer) on Nebula Storefront, set your own role to owner via POST /projects/1/members/role.
- **Walkthrough (coach text):** Step by step: 1) Log in as sara (viewer) or nadia (developer). 2) In the Team table of /projects/1, set your own role to owner and submit — or curl POST /projects/1/members/role with your userId and role=owner. 3) Your role changes although you are not the owner. The test passes on that change.
- **Lesson:** Privilege management is itself a privileged operation — enforce it server-side, not by hiding the button.

### Member Removes the Project Owner (Advanced · A01 Broken Access Control)
- **Objective:** make the "kick-owner" test flip to done on /tests by performing the real exploit.
- Hint 1: Next to every team member there is a Remove button — including next to the owner.
- Hint 2: Removing the project owner should be impossible for a non-owner; the endpoint does not check.
- Hint 3: As sara or nadia, remove user 2 (the owner) from Nebula Storefront via POST /projects/1/members/remove.
- **Walkthrough (coach text):** Step by step: 1) Log in as sara or nadia. 2) In the Team table of /projects/1, click Remove next to Tanvir (the owner) — or curl POST /projects/1/members/remove with userId=2. 3) The owner is gone from their own project. The test passes on that removal.
- **Lesson:** Destructive team actions need caller checks and target protections — the owner of a project must never be removable by the people they manage.

## Admin Panel

### Destructive Admin Action as a Plain GET (CSRF) (Intermediate · A01 Broken Access Control)
- **Objective:** make the "admin-csrf" test flip to done on /tests by performing the real exploit.
- Hint 1: The admin panel has a "Purge deploy history" action — look at how it is invoked.
- Hint 2: It is a plain GET link: no form, no token, no confirmation. Any page the admin visits can fire it.
- Hint 3: While holding the admin gate (cookie or real admin), GET /admin/purge — the entire deploy history is wiped by a link.
- **Walkthrough (coach text):** Step by step: 1) Reach /admin (real admin via SQLi/admin login, or the hx_role=admin cookie). 2) Click "Purge deploy history" — or simply GET /admin/purge. 3) The deploy history is emptied by a tokenless GET. The test passes when the purge executes.
- **Lesson:** State changes must never ride on GET, and admin actions need CSRF tokens plus confirmation — otherwiseone stray link click (or one malicious image tag) fires them.

## Platform & API

### Unauthenticated API Dumps Every User (Passwords Included) (Beginner · A01 Broken Access Control)
- **Objective:** make the "api-user-dump" test flip to done on /tests by performing the real exploit.
- Hint 1: The platform exposes a JSON API under /api/.
- Hint 2: One endpoint returns the user directory — try fetching it with no login and no key at all.
- Hint 3: curl /api/users — every account, with its password in clear text.
- **Walkthrough (coach text):** Step by step: 1) Without logging in, curl http://127.0.0.1:3033/api/users. 2) The JSON lists every user with email, role and password. The test passes when that dump is served.
- **Lesson:** APIs need the same authentication and data-minimisation as the UI: never return password material, and never leave directory endpoints open.

### Weak Static API Key Leaks Projects & Secrets (Intermediate · A07 Auth Failures)
- **Objective:** make the "api-weak-key" test flip to done on /tests by performing the real exploit.
- Hint 1: The API documentation page (/api-docs) is meant for integrators — read it closely.
- Hint 2: It prints a live "demo" API key — and the API accepts that same key for full read access.
- Hint 3: curl /api/projects with header x-api-key set to the key from /api-docs — every project, every environment, every secret comes back.
- **Walkthrough (coach text):** Step by step: 1) Open /api-docs and copy the demo API key printed there. 2) curl /api/projects -H "x-api-key: <key>". 3) The response contains all projects with environments and secret values. The test passes when the key is accepted.
- **Lesson:** API keys must be unique per customer, high-entropy, scoped, and rotatable. A documented demo key with production read access is a breach waiting for a reader.

### Guessable Environment Share Links (Sequential Tokens) (Intermediate · A01 Broken Access Control)
- **Objective:** make the "share-token-enum" test flip to done on /tests by performing the real exploit.
- Hint 1: Environments can be "shared" with a link like /share/share-<id>.
- Hint 2: The token is just the environment’s sequential ID — nothing random at all.
- Hint 3: Probe /share/share-1 through /share/share-5 — each one opens that environment’s variables, no login needed.
- **Walkthrough (coach text):** Step by step: 1) Log out (share links need no account). 2) Visit /share/share-1, /share/share-2, … up to /share/share-5. 3) Each renders that environment’s variables. The test passes once 5 distinct share tokens have been probed in one session.
- **Lesson:** Share links are bearer credentials: they must be long, random and revocable. A sequential ID as a token is an open door with a number on it.
