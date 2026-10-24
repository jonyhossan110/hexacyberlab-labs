# HexaDeploy — Vulnerability Map (LAB 24)

All 26 scored tests, grouped by feature. Every entry is a real, working flaw in the app; each is detected server-side when the exploit actually succeeds.

## Login & Authentication

### SQL Injection — Login Bypass
- **OWASP:** A03 Injection · **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Open /login. 2) In the email field enter: ' OR '1'='1' --  3) Enter any password and submit. 4) You are logged in as the first user in the table (the platform admin) because the query became: email='' OR '1'='1' — always true.
- **Client impact:** On a real client deployment platform, this is a full takeover of the first account in the table — usually the platform admin — with no password at all. From there, every project and production secret is exposed.
- **Report as:** "SQL Injection in Login Form Allows Authentication Bypass" (Critical) — Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.

### Brute Force — No Rate Limiting on Login
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Pick an account, e.g. qa@hexadeploy.local. 2) Submit a wrong password 10 times (curl loop or Intruder). 3) Every attempt is processed at full speed — no block, no delay. 4) The test passes at the 10th accepted failure.
- **Client impact:** Attackers can grind through password lists against real operator accounts; one weak password becomes control of the deployment pipeline — and of production.
- **Report as:** "No Rate Limiting or Account Lockout on Login Endpoint" (High) — Add progressive delays/lockout per account and IP, CAPTCHA after failures, and offer MFA.

### User Enumeration via Login & Reset Responses
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner
- **Where / how:** Step by step: 1) In one session, submit /login with an invented email — note "No account found for that email." 2) Submit a real email with a wrong password — note the different message "Incorrect password…". 3) /forgot behaves the same way. The test passes once one session has seen both answers.
- **Client impact:** Attackers harvest valid operator emails from the client’s own login page, then aim phishing and password spraying precisely at the people who can deploy.
- **Report as:** "Account Enumeration via Differential Authentication Responses" (Medium) — Return one generic message ("invalid credentials" / "if the account exists…") for every failure case.

### Default / Demo Credentials Still Active
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Open /login. 2) Sign in as demo@hexadeploy.local / demo123. 3) The account is fully active — that successful login is the finding.
- **Client impact:** Anyone who reads the product’s docs or guesses the demo login walks straight into the client’s deployment workspace.
- **Report as:** "Active Default/Demo Account with Known Password" (High) — Remove demo/default accounts before production; force unique credentials for every seeded user.

### Predictable Password-Reset Token
- **OWASP:** A07 Auth Failures · **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Note the token format: rst-<userId>-<epoch minute>. 2) In a fresh session (never use /forgot for the victim), compute the token for the victim’s ID with the current minute. 3) POST /reset with their email, your computed token and a new password. 4) The reset succeeds — you forged it. The test passes because the token was never issued to your session.
- **Client impact:** An attacker resets the password of any operator — including admins — knowing only their email and the time of day. Full account takeover, no inbox access needed.
- **Report as:** "Password Reset Tokens Are Predictable (ID + Timestamp)" (Critical) — Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, single use.

### Session/Role Cookie Tampering
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Log in as any normal user (e.g. victor). 2) In your browser’s cookie editor (or with curl -b) set the cookie hx_role to admin. 3) Open /admin. 4) The admin panel opens because the gate reads the cookie, not the account — the test passes when a non-admin reaches /admin this way.
- **Client impact:** Any normal user promotes themselves to platform admin by editing a cookie — full control of every project, pipeline and secret on the client’s deployment platform.
- **Report as:** "Platform Role Trusted from Unsigned Client Cookie" (Critical) — Keep authorisation state server-side in the session; never trust client-supplied role values.

## Registration & Profile

### Weak Password Policy (1-Character Passwords)
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Open /register. 2) Create an account with the password "x" (one character). 3) The account is created and works — the test passes.
- **Client impact:** Users will pick trivial passwords, and every one of them is an easy account takeover on the client’s platform.
- **Report as:** "Registration Accepts Trivially Weak Passwords" (Medium) — Enforce a minimum length (≥10) and screen against known-breached password lists.

### Mass Assignment — Self-Assigning the Admin Role
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Intercept or curl the /register POST. 2) Add the extra field role=admin to the body. 3) Submit — the account is created with the platform admin role (check the Admin link). 4) The same trick works via POST /profile. The test passes when the injected role takes effect.
- **Client impact:** A stranger registers and instantly owns the platform: every project, every pipeline, every production secret.
- **Report as:** "Mass Assignment Allows Privilege Escalation via role Parameter" (Critical) — Whitelist bindable fields explicitly; never bind role/privilege fields from client input.

### Stored XSS via Display Name
- **OWASP:** A03 Injection · **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Register a new account (or edit your profile) with the name: <script>alert(1)</script> 2) Submit. 3) The payload is stored verbatim and rendered raw wherever the name appears — the test passes at store time.
- **Client impact:** An attacker plants a script in their profile name; every operator and admin who opens a team list runs it — session theft and deploys in their name.
- **Report as:** "Stored Cross-Site Scripting in User Display Name" (High) — Context-encode all user-controlled output; sanitise stored rich text with an allowlist.

### CSRF on Profile Update
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Log in as any user and note your cookie. 2) From curl, POST /profile with a new name, your session cookie, an Origin: https://evil.example header and NO hx_tok field. 3) The name changes — the request was accepted cross-site. The test passes when a state change lands without a valid token.
- **Client impact:** A malicious page a logged-in operator visits silently rewrites their profile — the first step to account-takeover chains (e.g. changing the recovery email).
- **Report as:** "Cross-Site Request Forgery on Profile Update (Token Not Verified)" (Medium) — Verify the anti-CSRF token server-side on every state-changing request; enforce SameSite cookies.

## Projects

### Cross-Project IDOR — Reading Another Team’s Project
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Log in as victor@hexadeploy.local (owner of DataSync Worker only). 2) Open /projects/1. 3) Nebula Storefront renders in full — members, environments, builds, deploys — although you are not a member. The test passes when a non-member is served the project.
- **Client impact:** A low-privilege user or a competitor reads other teams’ deployment setup, environments and history just by changing a number in the URL.
- **Report as:** "Insecure Direct Object Reference on Project Detail (No Membership Check)" (High) — Check project membership/ownership on every project-scoped query; scope queries by the caller’s memberships.

### Search Leaks Other Projects’ Environments & Builds
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Log in as victor. 2) Open /search?q=production. 3) Environments and builds belonging to projects you are not a member of are listed. The test passes when a result from a foreign project is served to you.
- **Client impact:** Any user can enumerate the client’s projects, environments and pipeline activity — reconnaissance that points straight at the production targets.
- **Report as:** "Search Results Not Scoped by Project Membership (Information Disclosure)" (Medium) — Apply the same membership filters to search queries as to direct object access.

## Builds & Pipelines

### Build Log IDOR — Reading Another Project’s Build Logs
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Log in as victor (not a member of Nebula Storefront). 2) Open /builds/2/log. 3) The other project’s build log is served in full. The test passes when a non-member reads the log.
- **Client impact:** Build logs are reconnaissance gold: stack traces, internal URLs, tooling versions — and, as the next test shows, sometimes the production secrets themselves.
- **Report as:** "Insecure Direct Object Reference on Build Log (No Project Check)" (High) — Authorise build-log access against the parent project’s membership on every request.

### Production Secrets Printed in Build Logs
- **OWASP:** A09 Logging Failures · **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Log in as sara@hexadeploy.local (viewer on Nebula Storefront — no production rights). 2) Open /builds/2/log. 3) The log contains the real production values (DB_PASSWORD, STRIPE_SECRET_KEY) because the build printed its environment. The test passes when a user without production access is served a log containing a production secret.
- **Client impact:** Anyone who can see the build log walks away with the live database password and the payment provider’s secret key — direct production compromise without touching the servers.
- **Report as:** "Production Secrets Exposed in Build Logs (Unmasked Environment Dump)" (Critical) — Mask all secret variables in CI output, block env/printenv debug steps, restrict log access, and rotate the exposed secrets.

### Build-Log Injection via Version String
- **OWASP:** A03 Injection · **Difficulty:** Advanced
- **Where / how:** Step by step: 1) Log in as any project member (e.g. dev@). 2) In the Trigger build form, set the version to: v9.9.9$(printenv) 3) Submit and open the new build’s log. 4) The log shows a forged environment dump — your input was treated as a command. The test passes when the injected build is created.
- **Client impact:** An attacker forges log entries to hide real activity — or, where the pipeline echoes the environment, tricks the build into printing the production secrets it runs with.
- **Report as:** "Build Version String Injected into Pipeline Log (Log Forging / Env Dump)" (High) — Validate version strings against a strict semver pattern; never pass raw user input into shell steps; sanitise log output.

## Environments & Secrets

### Environment IDOR — Reading Another Project’s Production Secrets
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Log in as victor. 2) Open /envs/3. 3) The production environment of a project you do not belong to renders with every variable in clear text. The test passes when a non-member is served the environment.
- **Client impact:** One changed digit hands an attacker the client’s live database password and payment keys — production data breach and fraudulent charges follow directly.
- **Report as:** "Insecure Direct Object Reference on Environment Secrets (No Project Check)" (Critical) — Check project membership AND production-access role on every environment read; mask secret values by default.

### Secret Variable Tampering by a Read-Only Viewer
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Log in as sara@hexadeploy.local (viewer). 2) Open /envs/3 and use the Update variables form — or curl POST /envs/3/update with vars=API_URL=https://evil.example 3) The production variable is changed. The test passes when a user without production rights modifies a production environment.
- **Client impact:** A read-only account silently points production at an attacker’s database or swaps the payment key — a supply-chain attack executed from inside the client’s own pipeline.
- **Report as:** "Missing Authorisation on Production Secret Update (Viewer Can Tamper)" (Critical) — Require the production/owner role server-side for secret writes; audit-log every change; consider dual approval for production.

### Viewer Creates a Production Environment
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Log in as sara (viewer on Nebula Storefront). 2) On /projects/1, use the Add environment form with name=prod-backup and kind=production. 3) The environment is created. The test passes because a non-owner created a production environment.
- **Client impact:** A low-privilege user stands up a shadow "production" environment with attacker-controlled endpoints — deployments and webhooks can be steered there.
- **Report as:** "Missing Authorisation on Environment Creation (Viewer Can Create Production)" (High) — Restrict environment creation to project owners; validate the kind server-side; audit new environments.

## Deployments & Rollback

### Deploy to Production Without the Production Role
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Log in as sara (viewer). 2) On /projects/1, use the Deploy form: environment=production (3), build=1. 3) Submit — the deploy is recorded as live in production. The test passes when a user without production rights deploys to a production environment.
- **Client impact:** A read-only viewer ships arbitrary code to the client’s live store — defacement, skimmers, or a full storefront takeover in one click.
- **Report as:** "Missing Role Check on Production Deployment (Viewer Can Deploy)" (Critical) — Enforce owner/developer role server-side for production deploys; log and notify on every production release.

### Rollback Abuse — Reverting Production Without Rights
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Log in as sara (viewer). 2) On /projects/1, find deploy 2 (the live production deploy) and click Roll back — or curl POST /deploys/2/rollback. 3) Production is reverted by a read-only account. The test passes on that state change.
- **Client impact:** A low-privilege user knocks the client’s store back to an old, vulnerable release — or takes production down during peak sales — with a single click.
- **Report as:** "Missing Authorisation on Production Rollback" (High) — Require the production role server-side for rollbacks; audit-log them and notify the project owners.

## Team & Roles

### Team Role Escalation — Non-Owner Rewrites Project Roles
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Log in as sara (viewer) or nadia (developer). 2) In the Team table of /projects/1, set your own role to owner and submit — or curl POST /projects/1/members/role with your userId and role=owner. 3) Your role changes although you are not the owner. The test passes on that change.
- **Client impact:** Any team member crowns themselves project owner, gaining production deploys, secret access and the power to remove the real owner.
- **Report as:** "Missing Authorisation on Team Role Management" (High) — Restrict role changes to project owners server-side; audit all privilege changes.

### Member Removes the Project Owner
- **OWASP:** A01 Broken Access Control · **Difficulty:** Advanced
- **Where / how:** Step by step: 1) Log in as sara or nadia. 2) In the Team table of /projects/1, click Remove next to Tanvir (the owner) — or curl POST /projects/1/members/remove with userId=2. 3) The owner is gone from their own project. The test passes on that removal.
- **Client impact:** A disgruntled member ejects the legitimate owner from their own project — losing control of production until an admin intervenes. A hostile takeover of the release pipeline.
- **Report as:** "Project Owner Removable by Non-Owner Team Members" (High) — Only owners can remove members; the project owner can never be removed by another member; require transfer-of-ownership flow instead.

## Admin Panel

### Destructive Admin Action as a Plain GET (CSRF)
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Reach /admin (real admin via SQLi/admin login, or the hx_role=admin cookie). 2) Click "Purge deploy history" — or simply GET /admin/purge. 3) The deploy history is emptied by a tokenless GET. The test passes when the purge executes.
- **Client impact:** An attacker who gets an admin to load a page with an <img> pointing at the purge URL destroys the client’s deploy audit history — hiding every other attack in this lab.
- **Report as:** "State-Changing Admin Action on GET Without CSRF Protection (Deploy History Purge)" (High) — Make destructive actions POST-only with a verified anti-CSRF token and an explicit confirmation step; keep an immutable audit log.

## Platform & API

### Unauthenticated API Dumps Every User (Passwords Included)
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Without logging in, curl http://127.0.0.1:3033/api/users. 2) The JSON lists every user with email, role and password. The test passes when that dump is served.
- **Client impact:** Anyone on the internet downloads the client’s full operator list with working passwords — every account, including admins, falls at once.
- **Report as:** "Unauthenticated API Endpoint Exposes All Users Including Passwords" (Critical) — Require authentication and authorisation on every API endpoint; never serialise password fields.

### Weak Static API Key Leaks Projects & Secrets
- **OWASP:** A07 Auth Failures · **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Open /api-docs and copy the demo API key printed there. 2) curl /api/projects -H "x-api-key: <key>". 3) The response contains all projects with environments and secret values. The test passes when the key is accepted.
- **Client impact:** Anyone who reads the public docs exfiltrates the client’s whole deployment inventory — projects, environments and the production secrets inside them.
- **Report as:** "Documented Static API Key Grants Full Read Access to Projects and Secrets" (Critical) — Issue per-client high-entropy keys, scope them least-privilege, keep secrets out of API responses, and rotate the leaked key.

### Guessable Environment Share Links (Sequential Tokens)
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Log out (share links need no account). 2) Visit /share/share-1, /share/share-2, … up to /share/share-5. 3) Each renders that environment’s variables. The test passes once 5 distinct share tokens have been probed in one session.
- **Client impact:** Anyone can walk the numbers and read every environment’s secrets the client ever shared — including production — without any account at all.
- **Report as:** "Environment Share Tokens Are Sequential and Enumerable" (High) — Generate share tokens with a CSPRNG (≥128 bits), support revocation and expiry, and never derive them from object IDs.
