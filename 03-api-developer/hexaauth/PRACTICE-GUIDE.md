# HexaAuth — Practice Guide (LAB 29)

Work through the challenges feature by feature. The in-app **/tests** mission page mirrors this guide and tracks your progress; the Lab Coach chatbot gives step-by-step help for a feature once you have genuinely tried that feature at least 3 times.

## Login & Authentication

### Challenge: SQL Injection — Login Bypass (Beginner)
- **Objective:** Make the "SQL Injection — Login Bypass" test flip to done on /tests by performing the real exploit — String-built SQL queries let an attacker rewrite the login check itself. Parameterised queries remove the whole class.
- **Hints:**
  1. The console login builds its query by gluing your input straight into the SQL string.
  2. A classic tautology in the email field can make the WHERE clause true for the first row in the table.
  3. Try email: ' OR '1'='1' --  with any password — you land in the first account, which is the platform admin.
- **Walkthrough (after your own attempts):** Step by step: 1) Open /login. 2) In the email field enter: ' OR '1'='1' --  3) Enter any password and submit. 4) You are logged in as the first user in the table (the platform admin) because the query became always-true.

### Challenge: Brute Force — No Rate Limiting on Login (Beginner)
- **Objective:** Make the "Brute Force — No Rate Limiting on Login" test flip to done on /tests by performing the real exploit — Without throttling or lockout, online password guessing is cheap and quiet. Rate limits + lockout + MFA are the standard defence.
- **Hints:**
  1. Nothing slows you down: no lockout, no CAPTCHA, no delay.
  2. Write a loop (or use Burp Intruder) and fire wrong passwords at one console account.
  3. After 10 failed attempts the app is still happily processing guesses — that missing throttle is the finding.
- **Walkthrough (after your own attempts):** Step by step: 1) Pick an account, e.g. dev@acme.local. 2) Submit a wrong password 10 times (curl loop or Intruder). 3) Every attempt is processed at full speed — no block, no delay. 4) The test passes at the 10th accepted failure.

### Challenge: User Enumeration via Login & Reset Responses (Beginner)
- **Objective:** Make the "User Enumeration via Login & Reset Responses" test flip to done on /tests by performing the real exploit — Different responses for "no such user" vs "wrong password" hand attackers a free list of valid accounts to target.
- **Hints:**
  1. Compare the error for an email that exists with one that does not.
  2. The login form and the forgot-password form answer differently depending on whether the account is real.
  3. Probe one real address (from the README) and one invented address in the same session — the difference is the oracle.
- **Walkthrough (after your own attempts):** Step by step: 1) In one browser session, submit /login with an invented email — note "No account found for that email." 2) Submit a real email with a wrong password — note the different message. 3) /forgot behaves the same way. The test passes once one session has seen both answers.

### Challenge: Default / Demo Credentials Still Active (Beginner)
- **Objective:** Make the "Default / Demo Credentials Still Active" test flip to done on /tests by performing the real exploit — Demo and default accounts shipped to production are pre-made doors: their passwords are public knowledge.
- **Hints:**
  1. Seeded/demo accounts are a classic leftover in production identity platforms.
  2. The README’s test-account table includes a demo login — check whether it still works.
  3. demo@hexaauth.local with its documented demo password is still an active account.
- **Walkthrough (after your own attempts):** Step by step: 1) Open /login. 2) Sign in as demo@hexaauth.local / demo123. 3) The account is fully active — that successful login is the finding.

### Challenge: Predictable Password-Reset Token (Intermediate)
- **Objective:** Make the "Predictable Password-Reset Token" test flip to done on /tests by performing the real exploit — Reset tokens must be long, random and single-use. A token derived from public values (ID + time) can be forged for any account.
- **Hints:**
  1. Ask for a reset for your own account and study the token format (the flow is intentionally transparent in this lab).
  2. The token is built only from the user’s numeric ID and the current minute — nothing random.
  3. Compute rst-<victim id>-<current minute> for any account and post it straight to /reset without ever requesting a reset for that account.
- **Walkthrough (after your own attempts):** Step by step: 1) Note the victim’s numeric ID (admin = 1, demo = 5). 2) Compute the current epoch minute: Math.floor(Date.now()/60000). 3) POST /reset with token rst-<id>-<minute> and a new password — no reset email was ever requested. 4) Log in with the new password.

### Challenge: Session Cookie Role Tampering — Admin Gate Trusts hx_role (Intermediate)
- **Objective:** Make the "Session Cookie Role Tampering — Admin Gate Trusts hx_role" test flip to done on /tests by performing the real exploit — Authorization decisions must be made from server-side state. Anything the client sends — cookies included — is attacker-controlled.
- **Hints:**
  1. At login the server sets a second cookie, hx_role, copied from your account.
  2. The /admin gate reads that cookie instead of checking the server-side account record.
  3. Log in as any normal developer, change hx_role to admin in your browser, and open /admin.
- **Walkthrough (after your own attempts):** Step by step: 1) Log in as dev@acme.local (a normal user). 2) In DevTools → Application → Cookies, change hx_role from user to admin. 3) Browse to /admin — the gate trusts the cookie and shows the platform admin panel.

## Registration & Profile

### Challenge: Weak Password Policy on Registration (Beginner)
- **Objective:** Make the "Weak Password Policy on Registration" test flip to done on /tests by performing the real exploit — An identity platform that accepts 1-character passwords manufactures brute-forceable accounts by design.
- **Hints:**
  1. The registration form validates the email format carefully — but look at what it accepts as a password.
  2. There is no minimum length or complexity check at all.
  3. Register a new account with the password "a" — it is accepted.
- **Walkthrough (after your own attempts):** Step by step: 1) Open /register. 2) Create an account with password "a" (one character). 3) The account is created — the missing policy is the finding.

### Challenge: Mass Assignment — role Field at Registration (Intermediate)
- **Objective:** Make the "Mass Assignment — role Field at Registration" test flip to done on /tests by performing the real exploit — Bind only an explicit allow-list of fields. Anything else in the request body (role, plan, balance) must be ignored.
- **Hints:**
  1. The registration handler binds the whole request body onto the new user object.
  2. The visible form only shows name/email/password — but the model has more fields.
  3. Add a hidden field role=admin to the registration POST and the new account is created as an administrator.
- **Walkthrough (after your own attempts):** Step by step: 1) Intercept the POST /register request (or use curl). 2) Add the extra field role=admin to the body. 3) The account is created with the admin role — log in and open /admin to confirm.

### Challenge: Stored XSS in Display Name (Beginner)
- **Objective:** Make the "Stored XSS in Display Name" test flip to done on /tests by performing the real exploit — Every stored field is an injection surface wherever it is later rendered. Output-encode at render time, everywhere.
- **Hints:**
  1. Your display name is printed, unescaped, in the platform admin’s user list.
  2. That page renders names exactly as they were stored — no output encoding.
  3. Set your name to <script>alert(1)</script> (registration or profile) — it is stored and served raw to the admin.
- **Walkthrough (after your own attempts):** Step by step: 1) Register (or edit your profile) with the display name <script>alert(1)</script>. 2) Open /admin (the hx_role cookie trick from the Login feature gets a normal user in) — your name is printed into the user list unescaped and the payload fires in the admin’s browser.

### Challenge: CSRF on Profile Update (Intermediate)
- **Objective:** Make the "CSRF on Profile Update" test flip to done on /tests by performing the real exploit — State-changing endpoints need an unguessable per-session token, verified server-side on every request.
- **Hints:**
  1. Your own profile form carries a hidden marker field tied to your session.
  2. The server never actually checks that marker on POST /profile.
  3. Send the same POST without the marker (e.g. from curl, or an auto-submitting form on another site) — the change is applied anyway.
- **Walkthrough (after your own attempts):** Step by step: 1) Note the hidden hx_marker field in the /profile form. 2) POST /profile with your session cookie but WITHOUT hx_marker (curl works). 3) Your display name changes anyway — no token was ever verified.

## Tenant Apps & Clients

### Challenge: Cross-Tenant IDOR — Other Teams’ App Settings (Beginner)
- **Objective:** Make the "Cross-Tenant IDOR — Other Teams’ App Settings" test flip to done on /tests by performing the real exploit — Every object access must verify ownership/tenancy server-side. Hiding links in the UI is not access control.
- **Hints:**
  1. Your dashboard lists only your own apps — but the detail page takes any numeric ID.
  2. Nothing checks that the app belongs to you.
  3. Open /apps/2 while signed in as the Acme developer: you are reading (and can edit) Globex’s app settings.
- **Walkthrough (after your own attempts):** Step by step: 1) Log in as dev@acme.local (owner of app 1). 2) Browse to /apps/2. 3) Globex HR’s full settings page loads — client ID, redirect URIs, SSO config — although you are not its owner.

### Challenge: Client Secret Exposed via JSON API (Intermediate)
- **Objective:** Make the "Client Secret Exposed via JSON API" test flip to done on /tests by performing the real exploit — API responses must be built from allow-listed DTOs. A client secret is a credential — exposing it is equivalent to publishing the tenant’s password.
- **Hints:**
  1. There is a JSON API for app metadata: /api/apps/<id>.
  2. It serialises the whole app record — including the one field that should never leave the owner’s screen.
  3. Call /api/apps/2 as the Acme developer and read Globex’s client_secret straight from the JSON.
- **Walkthrough (after your own attempts):** Step by step: 1) Log in as any developer. 2) GET /api/apps/2 (an app you do not own). 3) The JSON contains clientSecret in full — that disclosure is the finding.

### Challenge: Plan Tampering via App Update (Intermediate)
- **Objective:** Make the "Plan Tampering via App Update" test flip to done on /tests by performing the real exploit — Billing-relevant fields must never be client-writable. The server owns plan state; updates bind an allow-list.
- **Hints:**
  1. The app settings form lets you edit the name and redirect URIs — the plan is shown as read-only text.
  2. The update handler, like registration, binds extra body fields without an allow-list.
  3. POST /apps/3/update with an added plan=enterprise field and the free app upgrades itself — no payment involved.
- **Walkthrough (after your own attempts):** Step by step: 1) Log in as dev@initech.local (app 3, free plan). 2) POST /apps/3/update with the normal fields PLUS plan=enterprise. 3) Reload the app page — the plan now reads enterprise.

## OAuth Flow

### Challenge: Redirect URI Validation Bypass (Intermediate)
- **Objective:** Make the "Redirect URI Validation Bypass" test flip to done on /tests by performing the real exploit — OAuth redirect URIs must match the registered value EXACTLY (string equality). Prefix, substring and wildcard matching all leak authorization codes.
- **Hints:**
  1. The authorize endpoint checks the redirect_uri against the registered one — but only that it STARTS WITH the registered origin.
  2. A look-alike host that begins with the same text passes the check.
  3. Use redirect_uri https://acme.example.evil.test/callback for client acme_web: the code is delivered to the attacker’s look-alike domain.
- **Walkthrough (after your own attempts):** Step by step: 1) Sign in as an Acme end user (alice@acme.example). 2) Open /oauth/authorize?client_id=acme_web&redirect_uri=https://acme.example.evil.test/callback and approve. 3) The browser is sent to the evil.test look-alike WITH a valid code — the prefix check passed it.

### Challenge: Predictable Access Tokens — Forgeable Bearer Tokens (Advanced)
- **Objective:** Make the "Predictable Access Tokens — Forgeable Bearer Tokens" test flip to done on /tests by performing the real exploit — Bearer tokens must be unguessable: long random values or properly signed (and verified) structures. Encoding is not encryption, and it is not authentication.
- **Hints:**
  1. Fetch /api/me with a real token and study its format.
  2. The token is just base64 of "<endUserId>:<appId>" plus a counter — no signature, no randomness.
  3. Forge hxat_<base64 of 3:2>.999999 for Carol at Globex and call /api/me — the API accepts a token it never issued.
- **Walkthrough (after your own attempts):** Step by step: 1) Get one real token and decode its middle part — it is base64 of "userId:appId". 2) Build hxat_ + base64("3:2") + ".999999" — a token never issued to anyone. 3) GET /api/me with Authorization: Bearer <forged> — Carol’s profile comes back.

### Challenge: Authorization Code Reuse — Codes Never Invalidated (Intermediate)
- **Objective:** Make the "Authorization Code Reuse — Codes Never Invalidated" test flip to done on /tests by performing the real exploit — Authorization codes must be short-lived and single-use; a second exchange must fail and should revoke tokens from the first.
- **Hints:**
  1. Authorization codes are supposed to be single-use.
  2. Exchange one code at /oauth/token and note the access token you get.
  3. Exchange the SAME code again — a second, fresh access token is issued. The code was never burned.
- **Walkthrough (after your own attempts):** Step by step: 1) Complete an authorize flow and capture the code. 2) POST /oauth/token with the code + client credentials — token issued. 3) POST the exact same code again — a second token is issued instead of an error.

## End Users & MFA

### Challenge: Cross-App End-User List Exposure (Passwords + MFA Secrets) (Beginner)
- **Objective:** Make the "Cross-App End-User List Exposure (Passwords + MFA Secrets)" test flip to done on /tests by performing the real exploit — Tenancy checks belong on every route that touches tenant data — especially the route that lists credentials.
- **Hints:**
  1. Each app has an end-user management page: /apps/<id>/users.
  2. Like the settings page, it never checks that the app is yours.
  3. As the Acme developer, open /apps/2/users — Globex’s end users, their plaintext passwords and MFA codes are all listed.
- **Walkthrough (after your own attempts):** Step by step: 1) Log in as dev@acme.local. 2) Open /apps/2/users. 3) Globex HR’s end users load with plaintext passwords and MFA codes — accounts you have no right to see.

### Challenge: MFA Bypass — Pending Session Treated as Full Session (Intermediate)
- **Objective:** Make the "MFA Bypass — Pending Session Treated as Full Session" test flip to done on /tests by performing the real exploit — A half-authenticated session must be a separate, restricted state. Until the second factor verifies, the session should reach nothing but the MFA page.
- **Hints:**
  1. Carol (Globex) has MFA on: password login sends her to a code page first.
  2. Look at what the session already contains the moment the password step succeeds.
  3. After the password step, skip the code page and browse straight to /enduser/home — the pending session is already trusted.
- **Walkthrough (after your own attempts):** Step by step: 1) At /enduser/login?app=globex_hr, sign in as carol@globex.example / carol123. 2) You are redirected to the MFA code page — do NOT enter a code. 3) Browse directly to /enduser/home: you are in, fully authenticated, MFA never completed.

### Challenge: Guessable App API Key — hx_live_<appId> (Intermediate)
- **Objective:** Make the "Guessable App API Key — hx_live_<appId>" test flip to done on /tests by performing the real exploit — API keys are credentials: they must be long, random and unguessable. A key derived from a public sequential ID is public.
- **Hints:**
  1. Apps can also be managed through an API key sent as X-Api-Key to /api/apps/<id>/users.
  2. Look at your own app’s key on its settings page and study the pattern.
  3. Your key is hx_live_1 because your app ID is 1. Try hx_live_2 against Globex’s user list — no console login needed.
- **Walkthrough (after your own attempts):** Step by step: 1) Note your own key format on /apps/1: hx_live_1. 2) curl /api/apps/2/users with header X-Api-Key: hx_live_2 — no session cookie at all. 3) Globex’s end users (with passwords) come back as JSON.

## SSO Configuration

### Challenge: SSO Configuration Tampering by Another Tenant (Intermediate)
- **Objective:** Make the "SSO Configuration Tampering by Another Tenant" test flip to done on /tests by performing the real exploit — Security configuration is the highest-value target in an identity platform; writing it must require ownership AND step-up authentication.
- **Hints:**
  1. The SSO settings form posts to /apps/<id>/sso — the same route family as the other app pages.
  2. Ownership is checked nowhere in this part of the console.
  3. As the Acme developer, POST a new ssoDomain for app 2 (Globex) — their SSO now points at a domain you control.
- **Walkthrough (after your own attempts):** Step by step: 1) Log in as dev@acme.local. 2) POST /apps/2/sso with ssoEnabled=on and ssoDomain=attacker.example. 3) Reopen /apps/2 — Globex’s SSO domain is now yours. Their login security was rewritten by a stranger.

### Challenge: Unverified SSO Assertion — Login as Anyone by Email (Advanced)
- **Objective:** Make the "Unverified SSO Assertion — Login as Anyone by Email" test flip to done on /tests by performing the real exploit — An identity assertion is only worth anything when it is signed by the IdP and the signature is verified. A form field is not an assertion.
- **Hints:**
  1. Apps with SSO enabled offer a "Continue with SSO" login at /sso/login.
  2. The handler trusts the email address typed into the form as a verified identity assertion — no signature, no redirect to a real IdP, no proof at all.
  3. Enter carol@globex.example for client globex_hr: you are signed in as Carol, MFA and password never involved.
- **Walkthrough (after your own attempts):** Step by step: 1) Open /sso/login?client_id=globex_hr. 2) Enter carol@globex.example (domain matches the app’s SSO domain) and submit — no password, no code. 3) You land on Carol’s end-user home, fully signed in.

## Admin Panel

### Challenge: State-Changing GET — Disable Any User with One Link (Intermediate)
- **Objective:** Make the "State-Changing GET — Disable Any User with One Link" test flip to done on /tests by performing the real exploit — GET requests must never change state. Combined with a missing CSRF token, any website an admin visits can fire admin actions.
- **Hints:**
  1. In the admin panel, each user row has a "Disable" action.
  2. Look at how it is implemented: a plain GET link — no form, no token, nothing to forge-proof it.
  3. While signed in as admin, just visiting /admin/users/5/disable disables that account — an <img> tag on any page could do the same to the admin’s browser.
- **Walkthrough (after your own attempts):** Step by step: 1) Sign in as admin (or use the hx_role cookie trick). 2) Visit /admin/users/5/disable directly in the address bar. 3) The demo account is disabled instantly — a bare GET changed platform state.

## Platform & API

### Challenge: Unauthenticated Console-User Dump at /api/console/users (Beginner)
- **Objective:** Make the "Unauthenticated Console-User Dump at /api/console/users" test flip to done on /tests by performing the real exploit — Every endpoint needs an explicit auth decision. "Internal" endpoints deployed to production are public endpoints.
- **Hints:**
  1. The platform API has a user-listing endpoint meant for internal tooling.
  2. Nobody ever put an authentication check on it.
  3. Open /api/console/users in a private window (no login at all) — every console user, with plaintext passwords, is returned.
- **Walkthrough (after your own attempts):** Step by step: 1) Log out (or open a private window). 2) GET /api/console/users. 3) All console accounts come back as JSON, passwords included — no session was ever presented.

### Challenge: Debug Endpoint Leaks Token-Signing Secret (Beginner)
- **Objective:** Make the "Debug Endpoint Leaks Token-Signing Secret" test flip to done on /tests by performing the real exploit — Debug/diagnostics surfaces must never ship to production; a leaked signing secret compromises every token the platform has ever issued.
- **Hints:**
  1. Developers left a diagnostics page in the production build.
  2. Try the classic path: /debug.
  3. It prints the platform configuration — including the secret used to sign tokens for every tenant.
- **Walkthrough (after your own attempts):** Step by step: 1) Browse to /debug (login not required). 2) The JSON prints environment, tenant count and the token-signing secret. 3) That secret is the finding — it should never be reachable.
