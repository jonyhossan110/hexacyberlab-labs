# HexaAnalytics — Vulnerability Map (25 scored tests)

Every vulnerability below is a **scored test** in the lab's progress system. A test completes only when the server detects the exploit actually succeeding — there is no "mark done". Grouped by feature; counts match the in-app **🎯 Tests** page exactly.

## Login & Authentication — 6 test(s)

### SQL Injection Login Bypass
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **Location:** POST /login
- **What it is:** String-built queries let attacker input change the query logic itself. Parameterised queries keep data and code separate, always.
- **Exploitation outline:** Step by step: 1) Open /login. 2) Enter the email ' OR '1'='1 and any password. 3) Submit — you are logged in as the platform admin, because the query became "WHERE email='' OR '1'='1'" and matched the first row.
- **Business impact:** An attacker logs in as the first account in the table — usually an administrator — with no password at all, taking over the whole analytics platform and every client dataset in it.
- **Report title:** SQL Injection in Login Form Allows Authentication Bypass
- **Fix:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.

### Brute Force — No Rate Limiting or Lockout
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **Location:** POST /login
- **What it is:** Without throttling or lockout, an attacker can try unlimited passwords against any account at full speed.
- **Exploitation outline:** Step by step: 1) Pick a real account, e.g. nadia@hexaanalytics.local. 2) POST /login with a wrong password 10 times (curl in a loop). 3) Notice every attempt is processed with the same friendly error — no delay, no CAPTCHA, no lockout. The test passes at the 10th accepted failure.
- **Business impact:** Attackers can grind through password lists against your clients' accounts — one weak password anywhere becomes a full breach with all their business metrics.
- **Report title:** Missing Rate Limiting and Account Lockout on Login
- **Fix:** Throttle login attempts per account and IP, add progressive delays / lockout and alerting on password-spray patterns.

### User Enumeration via Login & Forgot-Password Responses
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **Location:** POST /login, POST /forgot
- **What it is:** Different error messages for "no such user" vs "wrong password" hand attackers a free list of valid accounts to target.
- **Exploitation outline:** Step by step: 1) POST /login with a made-up email — the answer names the problem: no such account. 2) POST /login with nadia@hexaanalytics.local and a wrong password — a different answer confirms the account exists. 3) /forgot behaves the same way. Doing both probes completes the test.
- **Business impact:** An attacker first harvests which of your clients' emails are registered, then focuses password attacks only on real accounts — far faster and quieter.
- **Report title:** Account Enumeration via Differential Authentication Responses
- **Fix:** Return one generic message ("invalid credentials") for every failed login and forgot-password request.

### Weak / Default Credentials on a Seeded Account
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **Location:** Seeded demo account, via POST /login
- **What it is:** Default and demo credentials are public knowledge. Any account whose password is guessable from its name is an open door.
- **Exploitation outline:** Step by step: 1) Go to /login. 2) Sign in as demo@hexaanalytics.local with password demo123. 3) You are in — the seeded demo account was never rotated.
- **Business impact:** An attacker walks in through the forgotten demo account and inherits its access to live customer dashboards and exports — no exploit needed, just a login.
- **Report title:** Default Credentials Active on Demo Account
- **Fix:** Force a password change on first use, disable or remove demo accounts in production, and scan for default passwords.

### Predictable Password-Reset Token
- **OWASP:** A07 Authentication Failures · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **Location:** POST /forgot + POST /reset
- **What it is:** Reset tokens must be long, random and single-use. A token derived from the email is just the email written differently — anyone can mint one.
- **Exploitation outline:** Step by step: 1) The reset token is hex(email). For vera@hexaanalytics.local compute the hex of the email string (e.g. printf 'vera@hexaanalytics.local' | xxd -p). 2) POST /reset with that token and a new password. 3) Log in as Vera with the new password — full account takeover without email access.
- **Business impact:** Anyone who knows a client's email address can reset their password and take the account — including the admin's — without ever seeing an inbox.
- **Report title:** Predictable Password Reset Token (Derived from Email)
- **Fix:** Generate reset tokens from a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.

### Session Cookie Tampering — Client-Side Role Trusted
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **Location:** ha_session cookie, trusted by GET /admin
- **What it is:** Anything the client sends can be edited by the client. Roles and identities must be verified server-side (signed tokens or server sessions).
- **Exploitation outline:** Step by step: 1) Log in as vera@hexaanalytics.local (a viewer). 2) Copy the ha_session cookie and base64-decode it — it is plain JSON with your role. 3) Change "role":"viewer" to "role":"admin", re-encode base64url, replace the cookie. 4) Open /admin — you are treated as admin while your real account is still a viewer.
- **Business impact:** Every low-privilege user — even a read-only viewer — can promote themselves to platform admin by editing a cookie, then read or alter every customer's analytics.
- **Report title:** Broken Access Control: Unsigned Session Cookie Trusted for Role
- **Fix:** Use server-side sessions or signed/encrypted tokens, and always load the user's real role from the database per request.

## Registration & Profile — 4 test(s)

### No Password Policy at Registration
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **Location:** POST /register
- **What it is:** If the platform accepts any password, users will pick terrible ones — and the platform owns the consequences.
- **Exploitation outline:** Step by step: 1) Open /register. 2) Create an account with the password "a" (one character). 3) It is accepted — no policy exists.
- **Business impact:** Client accounts end up protected by passwords like "a" or "1234", which brute force and credential stuffing crack in seconds.
- **Report title:** Missing Password Complexity / Length Policy
- **Fix:** Enforce a minimum length (≥10) and screen against known-breached password lists at registration and reset.

### Mass Assignment — Self-Promotion via Registration Fields
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **Location:** POST /register
- **What it is:** Bind explicitly-allowed fields only. Trusting the request body to build privileged objects lets users grant themselves anything.
- **Exploitation outline:** Step by step: 1) POST /register with name, email, password AND the extra field role=admin. 2) The server copies every field onto the new user — including the role. 3) Your brand-new account is a platform admin.
- **Business impact:** Anyone on the internet can register themselves as a platform admin in one request and take over every workspace, dashboard and dataset on the platform.
- **Report title:** Mass Assignment in Registration Allows Role Escalation
- **Fix:** Whitelist bindable fields on registration/profile endpoints; set role and tenant server-side only.

### Stored XSS in Display Name
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **Location:** POST /profile (rendered in page header + team list)
- **What it is:** User-controlled strings must be output-encoded at render time, everywhere — including "harmless" name fields.
- **Exploitation outline:** Step by step: 1) Log in and open /profile. 2) Set your display name to <script>alert(1)</script> and save (include the hx_tok field from the form). 3) The payload is stored and rendered unescaped in the header and team list — it fires for anyone who views it.
- **Business impact:** An attacker plants a script in their profile name; every teammate or admin who views a dashboard runs it — session theft and actions in the victim's name follow.
- **Report title:** Stored Cross-Site Scripting via Display Name
- **Fix:** Contextually encode all user-supplied output; sanitise stored fields and deploy a restrictive Content-Security-Policy.

### CSRF on Profile Update
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Medium
- **Location:** POST /profile
- **What it is:** State-changing endpoints need unforgeable, verified anti-CSRF tokens and origin checks — a hidden field nobody validates is decoration.
- **Exploitation outline:** Step by step: 1) Note the hx_tok hidden field in the /profile form. 2) Send POST /profile with a new name, a foreign Origin header and NO hx_tok. 3) The server applies the change — it never verified the marker. That is CSRF.
- **Business impact:** A client admin visiting a malicious page while logged in silently gets their profile (name, contact data) rewritten by an attacker's site.
- **Report title:** Cross-Site Request Forgery on Profile Update
- **Fix:** Issue per-session CSRF tokens, verify them on every state change, and check Origin/Referer for sensitive posts.

## Dashboards — 2 test(s)

### Cross-Account Dashboard IDOR
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **Location:** GET /dashboard/:id
- **What it is:** Every object access must check that the object belongs to the caller's tenant. Sequential ids make guessing trivial.
- **Exploitation outline:** Step by step: 1) Log in as nadia@hexaanalytics.local (Northwind). 2) Open /dashboard/2. 3) Globex Media's executive dashboard is served — the handler never compares the dashboard's account with yours.
- **Business impact:** One client can open a competitor client's executive dashboard — revenue, growth, KPIs — just by changing a number in the URL.
- **Report title:** Insecure Direct Object Reference on Dashboard View
- **Fix:** Authorise every object load against the session tenant; use unguessable ids as defence in depth.

### Reflected XSS in Dashboard Filter
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **Location:** GET /dashboard/:id?q=
- **What it is:** Reflected input is as dangerous as stored input: encode everything echoed into a page, especially in "search/filter" UIs.
- **Exploitation outline:** Step by step: 1) Log in. 2) Visit /dashboard/1?q=<script>alert(1)</script>. 3) The page reflects the q value raw — the script executes in your session.
- **Business impact:** An attacker emails a client a crafted dashboard link; opening it runs script in the client's session — a believable phishing-to-takeover path.
- **Report title:** Reflected Cross-Site Scripting in Dashboard Filter Parameter
- **Fix:** Output-encode all reflected parameters and add a Content-Security-Policy.

## Datasets & Exports — 3 test(s)

### Cross-Account Dataset IDOR
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **Location:** GET /dataset/:id
- **What it is:** Raw data views need the same tenant authorisation as dashboards — the id in the URL is not a permission.
- **Exploitation outline:** Step by step: 1) Log in as Nadia (account 1). 2) Open /dataset/2. 3) Globex Media's dataset rows are served with no ownership check.
- **Business impact:** A client can read another company's raw underlying data — not just the pretty charts — and learn their exact campaign performance.
- **Report title:** Insecure Direct Object Reference on Dataset View
- **Fix:** Scope every dataset query by the session account id.

### Cross-Account Data Export IDOR
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **Location:** GET /dataset/:id/export
- **What it is:** Export endpoints concentrate sensitive data into one response; they need the strictest authorisation checks, not the weakest.
- **Exploitation outline:** Step by step: 1) Log in as Nadia (account 1). 2) GET /dataset/2/export?format=csv. 3) The full Globex dataset downloads — export checks neither owner nor anything else.
- **Business impact:** One click downloads a competitor client's entire dataset as CSV — quiet, complete data theft rather than screen-by-screen snooping.
- **Report title:** Insecure Direct Object Reference on Dataset Export (CSV/JSON)
- **Fix:** Authorise exports against the session tenant and role; log and alert on bulk exports.

### Viewer Role Can Export Data (Broken Function-Level Authorisation)
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **Location:** GET /dataset/:id/export
- **What it is:** Read-only roles must be enforced on the server for every privileged function, especially export and download actions.
- **Exploitation outline:** Step by step: 1) Log in as vera@hexaanalytics.local (role: viewer). 2) GET /dataset/1/export?format=csv. 3) The file downloads — the endpoint never checks that viewers may not export.
- **Business impact:** A client's read-only guest or junior staffer can walk out with the full dataset — the "viewer" permission was only a UI suggestion.
- **Report title:** Missing Function-Level Authorisation: Viewers Can Export Datasets
- **Fix:** Enforce role checks server-side on export/download endpoints (deny viewer role explicitly).

## Report Builder — 2 test(s)

### Report Builder Filter Injection Leaks Cross-Account Data
- **OWASP:** A03 Injection · **Difficulty:** Advanced · **Severity (in a real client report):** Critical
- **Location:** POST /reports (filter value)
- **What it is:** Injection flaws hide in "internal" query builders too — filters, sort keys and report definitions are user input and must be parameterised.
- **Exploitation outline:** Step by step: 1) Log in as Nadia. 2) Open /reports/new, choose dataset 1, filter field region, and value ' OR '1'='1. 3) Run it — the account condition is neutralised and the report contains Globex rows too. Cross-tenant injection, detected server-side.
- **Business impact:** A client analyst runs one "report" and pulls every other customer's metrics into it — a full cross-tenant data breach dressed as a feature.
- **Report title:** Injection in Report Builder Filter Bypasses Tenant Isolation
- **Fix:** Parameterise report-builder queries; validate filter fields against an allowlist and bind values as parameters.

### Report Saved into Another Account via accountId Tampering
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **Location:** POST /reports (accountId field)
- **What it is:** Tenant ownership of created objects must come from the session, never from the request body.
- **Exploitation outline:** Step by step: 1) Log in as Nadia (account 1). 2) POST /reports (the builder) with a name, datasetId 1, and accountId=2. 3) The saved report belongs to Globex — the server trusted the body over your session.
- **Business impact:** An attacker plants reports inside a victim company's workspace — polluting their analytics, or staging content their team will trust and open.
- **Report title:** Tenant Tampering in Report Creation (accountId Mass Assignment)
- **Fix:** Derive the owning account from the authenticated session on every create; ignore client-supplied tenant ids.

## Reports & Sharing — 4 test(s)

### Cross-Account Saved Report IDOR
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **Location:** GET /report/:id
- **What it is:** Reports concentrate a company's most sensitive conclusions; per-object tenant checks are mandatory.
- **Exploitation outline:** Step by step: 1) Log in as Nadia. 2) Open /report/2. 3) Globex's confidential report is served — no ownership check on saved reports either.
- **Business impact:** A client reads a competitor's confidential revenue report — the exact numbers they pay an analytics platform to keep private.
- **Report title:** Insecure Direct Object Reference on Saved Report View
- **Fix:** Scope report loads by session account; return 404 for objects outside the tenant.

### Guessable Share-Link Token Exposes Private Report
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **Location:** GET /share/:token
- **What it is:** Share tokens are capabilities: they must be long and random. A sequential token is just an id with a costume on.
- **Exploitation outline:** Step by step: 1) Log out. 2) Guess the token format: shr_ plus a small number, starting at 1001. 3) GET /share/shr_1001 — Globex's private report renders for an anonymous visitor.
- **Business impact:** Anyone can enumerate share links and read every "private" report clients ever shared — confidential numbers leak with no account and no trace.
- **Report title:** Predictable Share Tokens Expose Private Reports
- **Fix:** Generate share tokens with a CSPRNG (≥128 bits); rate-limit token lookups and log access.

### Share-Link Enumeration (No Throttling on Token Lookups)
- **OWASP:** A04 Insecure Design · **Difficulty:** Intermediate · **Severity (in a real client report):** Medium
- **Location:** GET /share/:token
- **What it is:** Capability URLs need rate limiting and monitoring on misses, or enumeration turns a small token space into an open index.
- **Exploitation outline:** Step by step: 1) GET /share/shr_2001, shr_2002, shr_2003, shr_2004, shr_2005 in quick succession. 2) Every probe is answered at full speed — the 5th distinct probe completes this test.
- **Business impact:** Attackers sweep the token space automatically and harvest every shared report on the platform in minutes.
- **Report title:** Unthrottled Share-Token Enumeration
- **Fix:** Rate-limit and alert on repeated invalid token lookups; use large random token spaces.

### Revoked Share Link Still Works via Embed Route
- **OWASP:** A01 Broken Access Control · **Difficulty:** Advanced · **Severity (in a real client report):** High
- **Location:** GET /embed/:token
- **What it is:** Revocation must be enforced at every access path. A forgotten secondary route silently resurrects every revoked link.
- **Exploitation outline:** Step by step: 1) Log in as Nadia; report 1 already has link shr_1002. 2) POST /report/1/revoke-share. 3) /share/shr_1002 now returns 410 — but GET /embed/shr_1002 still serves the full report. Revocation only covered one route.
- **Business impact:** A client who discovers a leak and revokes the link believes the data is safe — while the embed route keeps serving it to anyone with the URL.
- **Report title:** Share Revocation Bypass via Embed Endpoint
- **Fix:** Check link revocation centrally in one authorisation helper used by every route that serves shared content.

## Scheduled Reports — 1 test(s)

### Cross-Account Schedule Deletion IDOR
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **Location:** POST /schedule/:id/delete
- **What it is:** Destructive actions need ownership checks most of all; "they would need to guess the id" is not a control.
- **Exploitation outline:** Step by step: 1) Log in as Nadia (account 1). 2) POST /schedule/2/delete — schedule 2 belongs to Globex. 3) It is deleted. The handler never checks whose it is.
- **Business impact:** A malicious client silently deletes a competitor's scheduled reports — their board pack never arrives and nobody knows why.
- **Report title:** Insecure Direct Object Reference on Schedule Deletion
- **Fix:** Verify schedule ownership against the session account on every mutation; soft-delete with an audit trail.

## Admin Panel — 1 test(s)

### Admin User-List API Missing Authorisation
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **Location:** GET /admin/api/users
- **What it is:** Authorisation belongs on the API, not just the page that calls it. Attackers call the API directly.
- **Exploitation outline:** Step by step: 1) Log in as Nadia (analyst, not admin). 2) GET /admin/api/users. 3) Full JSON of all users on the platform — the endpoint checks that you are logged in, never that you are an admin.
- **Business impact:** Any ordinary user downloads the full user directory of the platform — emails and password material for targeted attacks against every client.
- **Report title:** Missing Authorisation on Admin User-List API
- **Fix:** Enforce admin role checks server-side on every admin API route; never return password material.

## Platform & API — 2 test(s)

### Unauthenticated Debug Endpoint Leaks Users, Keys & Tokens
- **OWASP:** A05 Security Misconfiguration · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **Location:** GET /api/debug
- **What it is:** Debug/diagnostic endpoints must never reach production unauthenticated — they aggregate the keys to the kingdom.
- **Exploitation outline:** Step by step: 1) Log out. 2) GET /api/debug. 3) The platform dumps its users, hashes, issued API keys and share tokens to an anonymous visitor.
- **Business impact:** One anonymous request hands an attacker every user, the platform API keys and all live share links — total compromise in a single call.
- **Report title:** Sensitive Data Exposure via Unauthenticated Debug Endpoint
- **Fix:** Remove debug endpoints from production builds, or gate them behind admin auth and network allowlists.

### Predictable API Key Derived from Email
- **OWASP:** A07 Authentication Failures · **Difficulty:** Advanced · **Severity (in a real client report):** High
- **Location:** GET /api/datasets (x-api-key header)
- **What it is:** API keys must be random secrets, not encodings of public identifiers. If it can be computed, it is not a key.
- **Exploitation outline:** Step by step: 1) Compute base64 of a user email: printf 'nadia@hexaanalytics.local' | base64. 2) GET /api/datasets with header x-api-key set to that value. 3) The API returns Nadia's account datasets — the "key" was never a secret.
- **Business impact:** Anyone who knows a client's email — public information — can call the API as them and pull their datasets programmatically, at scale.
- **Report title:** Weak API Authentication: Key Derived from Email Address
- **Fix:** Issue high-entropy random API keys, store only hashes, and remove legacy derived-key acceptance.
