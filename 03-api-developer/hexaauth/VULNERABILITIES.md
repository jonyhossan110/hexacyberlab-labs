# HexaAuth — Vulnerability Map (LAB 29)

HexaAuth is a deliberately vulnerable identity/authentication platform: developer console, tenant applications, simulated OAuth clients, per-app end users, SSO configuration and MFA. Every entry below is a scored test in the lab system — a test completes only when the exploit actually succeeds (detected server-side). Total: **24 tests across 8 features**.

## Login & Authentication (6)

### SQL Injection — Login Bypass
- **OWASP:** A03 Injection · **Difficulty:** Beginner
- **Location:** POST /login (console sign-in)
- **Exploitation outline:** Step by step: 1) Open /login. 2) In the email field enter: ' OR '1'='1' --  3) Enter any password and submit. 4) You are logged in as the first user in the table (the platform admin) because the query became always-true.
- **Impact:** On a real identity platform this is catastrophic: the first row is the platform admin, so one form field hands over every tenant app, every client secret and every end user.

### Brute Force — No Rate Limiting on Login
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner
- **Location:** POST /login (console sign-in)
- **Exploitation outline:** Step by step: 1) Pick an account, e.g. dev@acme.local. 2) Submit a wrong password 10 times (curl loop or Intruder). 3) Every attempt is processed at full speed — no block, no delay. 4) The test passes at the 10th accepted failure.
- **Impact:** Attackers can grind through password lists against developer accounts; one weak password becomes control of that tenant’s apps and their end users.

### User Enumeration via Login & Reset Responses
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner
- **Location:** POST /login and POST /forgot (differential error messages)
- **Exploitation outline:** Step by step: 1) In one browser session, submit /login with an invented email — note "No account found for that email." 2) Submit a real email with a wrong password — note the different message. 3) /forgot behaves the same way. The test passes once one session has seen both answers.
- **Impact:** Attackers harvest valid developer emails from the identity provider itself, then aim phishing and password spraying precisely at the people who control tenant apps.

### Default / Demo Credentials Still Active
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner
- **Location:** Seeded demo console account (demo@hexaauth.local)
- **Exploitation outline:** Step by step: 1) Open /login. 2) Sign in as demo@hexaauth.local / demo123. 3) The account is fully active — that successful login is the finding.
- **Impact:** Anyone who reads the product’s docs or guesses the demo login walks straight into the identity console.

### Predictable Password-Reset Token
- **OWASP:** A07 Auth Failures · **Difficulty:** Intermediate
- **Location:** POST /forgot + POST /reset (token = rst-<userId>-<epoch minute>)
- **Exploitation outline:** Step by step: 1) Note the victim’s numeric ID (admin = 1, demo = 5). 2) Compute the current epoch minute: Math.floor(Date.now()/60000). 3) POST /reset with token rst-<id>-<minute> and a new password — no reset email was ever requested. 4) Log in with the new password.
- **Impact:** An attacker resets the password of any console user — including the platform admin — knowing only their ID and the time of day. Full takeover of the identity platform, no inbox access needed.

### Session Cookie Role Tampering — Admin Gate Trusts hx_role
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Location:** GET /admin (gate trusts the client-supplied hx_role cookie)
- **Exploitation outline:** Step by step: 1) Log in as dev@acme.local (a normal user). 2) In DevTools → Application → Cookies, change hx_role from user to admin. 3) Browse to /admin — the gate trusts the cookie and shows the platform admin panel.
- **Impact:** Any low-privilege developer becomes platform admin by editing one cookie: every tenant, secret and end user on the platform is exposed.

## Registration & Profile (4)

### Weak Password Policy on Registration
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner
- **Location:** POST /register (no length/complexity check)
- **Exploitation outline:** Step by step: 1) Open /register. 2) Create an account with password "a" (one character). 3) The account is created — the missing policy is the finding.
- **Impact:** End users pick trivial passwords; attackers crack tenant accounts in seconds, and the identity provider gets the blame.

### Mass Assignment — role Field at Registration
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /register (whole body bound to the user record, incl. role)
- **Exploitation outline:** Step by step: 1) Intercept the POST /register request (or use curl). 2) Add the extra field role=admin to the body. 3) The account is created with the admin role — log in and open /admin to confirm.
- **Impact:** Self-service registration becomes self-service privilege escalation: anyone can mint a platform admin account in one request.

### Stored XSS in Display Name
- **OWASP:** A03 Injection · **Difficulty:** Beginner
- **Location:** Display name from POST /register / POST /profile, rendered unescaped in the /admin user list
- **Exploitation outline:** Step by step: 1) Register (or edit your profile) with the display name <script>alert(1)</script>. 2) Open /admin (the hx_role cookie trick from the Login feature gets a normal user in) — your name is printed into the user list unescaped and the payload fires in the admin’s browser.
- **Impact:** An attacker plants a script in their profile name; when a platform admin opens the user list, the script runs in the admin’s session — session theft and actions as admin.

### CSRF on Profile Update
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /profile (hx_marker issued but never verified)
- **Exploitation outline:** Step by step: 1) Note the hidden hx_marker field in the /profile form. 2) POST /profile with your session cookie but WITHOUT hx_marker (curl works). 3) Your display name changes anyway — no token was ever verified.
- **Impact:** A malicious page visited by a logged-in developer silently rewrites their profile — the classic stepping stone to account-recovery abuse.

## Tenant Apps & Clients (3)

### Cross-Tenant IDOR — Other Teams’ App Settings
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner
- **Location:** GET /apps/<id> (no ownership check)
- **Exploitation outline:** Step by step: 1) Log in as dev@acme.local (owner of app 1). 2) Browse to /apps/2. 3) Globex HR’s full settings page loads — client ID, redirect URIs, SSO config — although you are not its owner.
- **Impact:** Competitors or malicious tenants read each other’s OAuth configuration — redirect URIs, SSO domains, plan details — the reconnaissance for a full tenant takeover.

### Client Secret Exposed via JSON API
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Location:** GET /api/apps/<id> (full record serialised, incl. clientSecret)
- **Exploitation outline:** Step by step: 1) Log in as any developer. 2) GET /api/apps/2 (an app you do not own). 3) The JSON contains clientSecret in full — that disclosure is the finding.
- **Impact:** With another tenant’s client secret, an attacker can exchange stolen authorization codes and impersonate the real application to its users.

### Plan Tampering via App Update
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /apps/<id>/update (plan field bound from the request body)
- **Exploitation outline:** Step by step: 1) Log in as dev@initech.local (app 3, free plan). 2) POST /apps/3/update with the normal fields PLUS plan=enterprise. 3) Reload the app page — the plan now reads enterprise.
- **Impact:** Every free-tier tenant upgrades itself to the top plan for free — direct revenue loss, and proof the billing model trusts the client.

## OAuth Flow (3)

### Redirect URI Validation Bypass
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /oauth/authorize/approve (redirect_uri checked with startsWith on the origin)
- **Exploitation outline:** Step by step: 1) Sign in as an Acme end user (alice@acme.example). 2) Open /oauth/authorize?client_id=acme_web&redirect_uri=https://acme.example.evil.test/callback and approve. 3) The browser is sent to the evil.test look-alike WITH a valid code — the prefix check passed it.
- **Impact:** Attackers harvest authorization codes through phishing links on the real login page, then exchange them for access tokens — full end-user account takeover under the client’s own brand.

### Predictable Access Tokens — Forgeable Bearer Tokens
- **OWASP:** A02 Cryptographic Failures · **Difficulty:** Advanced
- **Location:** GET /api/me (access token = hxat_<base64 "euId:appId">.<counter>, no signature)
- **Exploitation outline:** Step by step: 1) Get one real token and decode its middle part — it is base64 of "userId:appId". 2) Build hxat_ + base64("3:2") + ".999999" — a token never issued to anyone. 3) GET /api/me with Authorization: Bearer <forged> — Carol’s profile comes back.
- **Impact:** Anyone can mint a working access token for ANY end user of ANY tenant app — total, silent impersonation across the whole platform.

### Authorization Code Reuse — Codes Never Invalidated
- **OWASP:** A07 Auth Failures · **Difficulty:** Intermediate
- **Location:** POST /oauth/token (codes never invalidated after exchange)
- **Exploitation outline:** Step by step: 1) Complete an authorize flow and capture the code. 2) POST /oauth/token with the code + client credentials — token issued. 3) POST the exact same code again — a second token is issued instead of an error.
- **Impact:** A leaked or logged code (browser history, proxy logs, referer headers) stays redeemable forever — anyone who ever sees it owns the account.

## End Users & MFA (3)

### Cross-App End-User List Exposure (Passwords + MFA Secrets)
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner
- **Location:** GET /apps/<id>/users (no ownership check; prints passwords + MFA codes)
- **Exploitation outline:** Step by step: 1) Log in as dev@acme.local. 2) Open /apps/2/users. 3) Globex HR’s end users load with plaintext passwords and MFA codes — accounts you have no right to see.
- **Impact:** One tenant reads another tenant’s entire user base WITH working passwords and MFA codes: those users are compromised on every service where they reused them.

### MFA Bypass — Pending Session Treated as Full Session
- **OWASP:** A07 Auth Failures · **Difficulty:** Intermediate
- **Location:** GET /enduser/home (pre-MFA pending session already trusted)
- **Exploitation outline:** Step by step: 1) At /enduser/login?app=globex_hr, sign in as carol@globex.example / carol123. 2) You are redirected to the MFA code page — do NOT enter a code. 3) Browse directly to /enduser/home: you are in, fully authenticated, MFA never completed.
- **Impact:** MFA that can be walked around with one URL change is worse than no MFA: the client believes high-risk users are protected when they are not.

### Guessable App API Key — hx_live_<appId>
- **OWASP:** A07 Auth Failures · **Difficulty:** Intermediate
- **Location:** GET /api/apps/<id>/users with X-Api-Key: hx_live_<appId>
- **Exploitation outline:** Step by step: 1) Note your own key format on /apps/1: hx_live_1. 2) curl /api/apps/2/users with header X-Api-Key: hx_live_2 — no session cookie at all. 3) Globex’s end users (with passwords) come back as JSON.
- **Impact:** Anyone on the internet can enumerate every tenant’s end-user list by counting 1, 2, 3… — a complete credential dump of the platform’s user base.

## SSO Configuration (2)

### SSO Configuration Tampering by Another Tenant
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /apps/<id>/sso (no ownership check on SSO writes)
- **Exploitation outline:** Step by step: 1) Log in as dev@acme.local. 2) POST /apps/2/sso with ssoEnabled=on and ssoDomain=attacker.example. 3) Reopen /apps/2 — Globex’s SSO domain is now yours. Their login security was rewritten by a stranger.
- **Impact:** An attacker repoints a victim tenant’s SSO at their own identity provider, then signs in as any of that tenant’s employees — a silent, persistent backdoor.

### Unverified SSO Assertion — Login as Anyone by Email
- **OWASP:** A07 Auth Failures · **Difficulty:** Advanced
- **Location:** POST /sso/login (typed email trusted as a verified IdP assertion)
- **Exploitation outline:** Step by step: 1) Open /sso/login?client_id=globex_hr. 2) Enter carol@globex.example (domain matches the app’s SSO domain) and submit — no password, no code. 3) You land on Carol’s end-user home, fully signed in.
- **Impact:** Every SSO-enabled tenant is wide open: type any employee’s email and you ARE that employee. Passwords and MFA are irrelevant.

## Admin Panel (1)

### State-Changing GET — Disable Any User with One Link
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Location:** GET /admin/users/<id>/disable (state change via GET, no token)
- **Exploitation outline:** Step by step: 1) Sign in as admin (or use the hx_role cookie trick). 2) Visit /admin/users/5/disable directly in the address bar. 3) The demo account is disabled instantly — a bare GET changed platform state.
- **Impact:** One malicious page view disables accounts across the platform — including other admins — from the victim admin’s own authenticated browser.

## Platform & API (2)

### Unauthenticated Console-User Dump at /api/console/users
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner
- **Location:** GET /api/console/users (no authentication at all)
- **Exploitation outline:** Step by step: 1) Log out (or open a private window). 2) GET /api/console/users. 3) All console accounts come back as JSON, passwords included — no session was ever presented.
- **Impact:** The full developer-account credential list of the identity platform is public — attackers take over tenant apps at leisure, including the admin account.

### Debug Endpoint Leaks Token-Signing Secret
- **OWASP:** A05 Security Misconfiguration · **Difficulty:** Beginner
- **Location:** GET /debug (production diagnostics incl. token-signing secret)
- **Exploitation outline:** Step by step: 1) Browse to /debug (login not required). 2) The JSON prints environment, tenant count and the token-signing secret. 3) That secret is the finding — it should never be reachable.
- **Impact:** With the signing secret, attackers forge perfectly valid tokens offline for any user of any tenant — a platform-wide, hard-to-detect compromise.
