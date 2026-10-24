# HexaMonitor — Vulnerability Map (LAB 27)

Every scored test in the lab, grouped by feature. 26 tests across 9 features.

## Login & Authentication

### SQL injection login bypass
- **OWASP:** A03:2021 Injection
- **Location:** POST /login
- **Exploitation outline:** Step by step: (1) Open the login page. (2) In the email field enter ada@northbeam.test' OR '1'='1 and any password. (3) Submit — you are logged in as Ada without knowing her password, because the query becomes true for the first matching row.
- **Impact:** On a real monitoring account this hands an attacker the keys to the kingdom: they can silence alerts and hide downtime while they attack the client’s actual website.

### Brute force — no rate limit or lockout
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Location:** POST /login
- **Exploitation outline:** Step by step: (1) Pick a real account, e.g. omar@northbeam.test. (2) Submit a wrong password. (3) Repeat it at least 10 times — every attempt is processed at full speed and the account never locks.
- **Impact:** An attacker can grind through password lists against the client’s monitoring account overnight and nobody is alerted — the attempts are not even counted.

### User enumeration via different error messages
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Location:** POST /login and POST /forgot
- **Exploitation outline:** Step by step: (1) Login with omar@northbeam.test and a wrong password — note "Incorrect password". (2) Login with nobody@nowhere.test — note "No account found for that email". (3) The difference proves which emails have accounts.
- **Impact:** Attackers first harvest valid staff emails from the login form, then aim password spraying only at accounts that definitely exist — quietly and efficiently.

### Default platform admin credentials unchanged
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Location:** POST /login (platform root account)
- **Exploitation outline:** Step by step: (1) Go to the login page. (2) Email: root@hexamonitor.test. (3) Password: admin123 — the vendor default. You are in as platform administrator.
- **Impact:** Anyone on the internet who guesses the vendor default owns the whole monitoring platform — every customer’s monitors, alerts and incidents.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Location:** POST /forgot and POST /reset
- **Exploitation outline:** Step by step: (1) Note the user IDs (Ada 1, Omar 2, Vera 3, Ben 4, Nia 5). (2) Compute HM- + hex(userId × 331 + dayOfYear), zero-padded to 4. (3) POST that token to /reset for the victim’s email with a new password — it is accepted even though no reset was ever requested.
- **Impact:** An attacker who knows a staff member’s email can compute the reset token and take the account — no inbox access needed.

### Session/cookie role tampering
- **OWASP:** A01:2021 Broken Access Control
- **Location:** GET /admin (hx_role cookie)
- **Exploitation outline:** Step by step: (1) Log in as Vera (viewer). (2) In your browser’s cookie editor set hx_role to platform. (3) Open /admin — the platform console loads, because the gate reads the cookie instead of the session.
- **Impact:** The lowest-privilege viewer account becomes platform administrator by changing one cookie — every customer on the platform is exposed at once.

## Registration & Profile

### Weak password policy on registration
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Location:** POST /register
- **Exploitation outline:** Step by step: (1) Open /register. (2) Create an account with password "a". (3) The account is created and logged in — no policy stopped you.
- **Impact:** Customers who pick weak passwords get their monitoring accounts taken over, and attackers use them to blind the client before a real attack.

### Mass assignment — role granted at registration
- **OWASP:** A01:2021 Broken Access Control
- **Location:** POST /register (role parameter)
- **Exploitation outline:** Step by step: (1) Intercept or hand-craft the /register POST. (2) Add role=platform to the form fields. (3) Submit — your brand-new account holds the platform role and /admin opens.
- **Impact:** Anyone can self-register a platform-admin account on the client’s SaaS — full control of every tenant without ever attacking a login.

### Stored XSS in display name
- **OWASP:** A03:2021 Injection
- **Location:** POST /profile (name), served on /team and page headers
- **Exploitation outline:** Step by step: (1) Log in and open /profile. (2) Set your name to Ada <script>alert(1)</script> and save. (3) Open /team — the script executes for anyone viewing the page.
- **Impact:** A malicious name fires in the browser of every teammate and admin who opens the team page — session theft and actions in their name follow.

### CSRF on profile update
- **OWASP:** A01:2021 Broken Access Control
- **Location:** POST /profile
- **Exploitation outline:** Step by step: (1) Log in. (2) From a different origin (or a hand-made form without the hx_marker field), POST a new name/email to /profile with the victim’s cookies attached. (3) The change is applied — no token was checked.
- **Impact:** A booby-trapped page silently rewrites a logged-in admin’s profile (name, notification email) — the first step to account recovery abuse.

## Monitors

### Cross-account monitor IDOR (read)
- **OWASP:** A01:2021 Broken Access Control
- **Location:** GET /monitors/:id
- **Exploitation outline:** Step by step: (1) Log in as Ada from Northbeam. (2) Browse to /monitors/4. (3) You are reading PixelPort’s monitor — URL, status and the internal note — because the handler never checks account ownership.
- **Impact:** A competitor or attacker enumerates the client’s entire infrastructure map — every URL, every internal note — straight from a free account.

### Cross-account monitor tampering (edit)
- **OWASP:** A01:2021 Broken Access Control
- **Location:** POST /monitors/:id/edit
- **Exploitation outline:** Step by step: (1) Log in as Ada. (2) POST to /monitors/4/edit with a new name and URL. (3) Open PixelPort’s monitor list as Ben — the change is real and was made by another tenant.
- **Impact:** An attacker repoints a rival’s monitors at dead URLs or renames them — the victim’s alerting now watches the wrong targets while the real site burns.

### SSRF in the quick-check tool
- **OWASP:** A10:2021 Server-Side Request Forgery
- **Location:** POST /tools/quickcheck
- **Exploitation outline:** Step by step: (1) Log in and open /monitors — the Quick check box fetches a URL for you. (2) Enter http://169.254.169.254.sim/latest/meta-data/iam/security-credentials. (3) The result shows simulated cloud credentials — the server fetched an internal address on your behalf.
- **Impact:** The monitoring server becomes a proxy into the client’s cloud metadata and internal network — credentials and internal services leak through a diagnostic tool.

### Monitor URL allowlist bypass via userinfo
- **OWASP:** A10:2021 Server-Side Request Forgery
- **Location:** POST /monitors (URL validation vs fetch)
- **Exploitation outline:** Step by step: (1) Try creating a monitor pointing straight at 169.254.169.254.sim — validation blocks it. (2) Create one with http://shop.northbeam.test@169.254.169.254.sim/latest/meta-data. (3) It is approved — and its automatic first check returns the internal metadata, because the fetcher resolves the host after the @.
- **Impact:** The one control meant to stop SSRF in monitor URLs is theatre — attackers walk straight past it with a single @ and reach internal services.

## Alert Rules

### Cross-account alert rule tampering
- **OWASP:** A01:2021 Broken Access Control
- **Location:** POST /alerts/:id/edit
- **Exploitation outline:** Step by step: (1) Log in as Ada. (2) POST /alerts/2/edit with notify=attacker@evil.test and a huge threshold. (3) PixelPort’s alert rule now points at the attacker — no ownership check stopped you.
- **Impact:** An attacker reroutes or mutes a client’s downtime alerts, then takes the real site down — the client’s team hears nothing until customers complain.

### Silencing a rival’s monitor via maintenance window
- **OWASP:** A01:2021 Broken Access Control
- **Location:** POST /maintenance
- **Exploitation outline:** Step by step: (1) Log in as Ada. (2) POST /maintenance with monitorId=4 and any note/duration. (3) PixelPort’s monitor now shows a maintenance badge — its alerts are paused, scheduled by a stranger.
- **Impact:** A fake "maintenance" window blinds the client’s on-call team for hours — the perfect cover for attacking the real website unnoticed.

## Incidents

### Stored XSS in incident comments
- **OWASP:** A03:2021 Injection
- **Location:** POST /incidents/:id/comment, served on the incident page
- **Exploitation outline:** Step by step: (1) Open any incident. (2) Post the comment <script>alert(document.domain)</script>. (3) Reload — the payload runs in every viewer’s browser because comments are printed unencoded.
- **Impact:** One poisoned incident comment hijacks the session of every responder who opens it — during a real outage, when the whole team is watching.

### Cross-account incident access
- **OWASP:** A01:2021 Broken Access Control
- **Location:** GET /incidents/:id
- **Exploitation outline:** Step by step: (1) Log in as Ada. (2) Open /incidents/2. (3) PixelPort’s incident detail — status, comments and the internal note — renders for a foreign tenant.
- **Impact:** A rival reads the client’s outage post-mortems live — root causes, weak points and embarrassed internal notes included.

## Status Pages

### Public status page leaks internal data
- **OWASP:** A01:2021 Broken Access Control
- **Location:** GET /status/:slug (unauthenticated)
- **Exploitation outline:** Step by step: (1) Log out. (2) Open /status/northbeam. (3) View source: the monitors’ INTERNAL notes and the account’s contact email are served to anonymous visitors.
- **Impact:** The whole internet can read the client’s internal infrastructure notes and staff contact emails from a page designed for customers.

### Status page enumeration
- **OWASP:** A01:2021 Broken Access Control
- **Location:** GET /status/:slug
- **Exploitation outline:** Step by step: (1) Log out. (2) Request /status/ for 5 different slugs in a row. (3) Each answers (page or 404) with no slowing or blocking — the customer directory is enumerable.
- **Impact:** Competitors harvest the monitoring provider’s customer list one slug at a time — a ready-made target list of companies and their infrastructure.

### Reflected XSS on the public status page
- **OWASP:** A03:2021 Injection
- **Location:** GET /status/:slug?notice=
- **Exploitation outline:** Step by step: (1) Log out. (2) Open /status/northbeam?notice=<script>alert(1)</script>. (3) The script executes — the parameter is reflected into the banner unencoded.
- **Impact:** Attackers send the client’s customers a link on the client’s own status domain that runs script in their browser — trust in the brand does the rest.

## Integrations

### SSRF via integration webhook test
- **OWASP:** A10:2021 Server-Side Request Forgery
- **Location:** POST /integrations/:id/test
- **Exploitation outline:** Step by step: (1) Create an integration with URL http://internal-admin.sim/. (2) Press "Send test". (3) The test result displays the internal ops console HTML — the server fetched an internal-only service for you.
- **Impact:** Through a "test webhook" button, attackers pull internal admin panels and metadata into the integration log — from a free trial account.

### Cross-account integration secrets exposure
- **OWASP:** A01:2021 Broken Access Control
- **Location:** GET /integrations/:id
- **Exploitation outline:** Step by step: (1) Log in as Ada. (2) Open /integrations/2. (3) PixelPort’s integration detail — endpoint and signing secret — is shown to a foreign tenant.
- **Impact:** With a rival’s webhook signing secret, an attacker forges "official" alert messages — fake all-clear or fake outage notices the client’s team will believe.

## Admin Panel

### Admin user deletion via GET (CSRF)
- **OWASP:** A01:2021 Broken Access Control
- **Location:** GET /admin/users/delete?id=
- **Exploitation outline:** Step by step: (1) Log in as platform admin (or via the cookie trick). (2) Visit /admin/users/delete?id=2. (3) The user is gone — a GET request performed a destructive, tokenless state change.
- **Impact:** A single link in an email deletes staff accounts from the client’s monitoring platform — no password, no confirmation, just a click.

## Platform & API

### API BOLA — accountId parameter crosses tenants
- **OWASP:** A01:2021 Broken Access Control
- **Location:** GET /api/monitors?accountId=
- **Exploitation outline:** Step by step: (1) Take Northbeam’s API key from the Integrations page. (2) GET /api/monitors?accountId=2 with header X-API-Key set to it. (3) The response lists PixelPort’s monitors — the parameter overrode your tenant.
- **Impact:** Every API customer can pull every other customer’s monitor inventory — the whole platform’s infrastructure map via one parameter.

### Legacy API key derived from email
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Location:** GET /api/monitors (X-API-Key)
- **Exploitation outline:** Step by step: (1) Note Ben’s public email: ben@pixelport.test. (2) Compute hmk_ + base64("ben@pixelport.test"). (3) GET /api/monitors with that X-API-Key — you are authenticated as PixelPort without ever seeing their real key.
- **Impact:** Anyone who knows a staff email — printed on the leaky status page — can mint a working API key for that company’s account.
