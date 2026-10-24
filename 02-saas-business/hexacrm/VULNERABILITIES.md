# HexaCRM — Vulnerability Map (26 scored tests)

Every vulnerability below is a **scored test** in the lab's progress system. A test completes only when the server detects the exploit actually succeeding — there is no "mark done". Grouped by feature; counts match the in-app **🎯 Tests** page exactly.


## Login & Authentication — 6 test(s)

### SQL Injection — Login Bypass
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate · **Location:** `POST /login` · **Report severity:** Critical
- **What it is:** Login queries built by string concatenation let an attacker rewrite the query logic and authenticate without any password.
- **How it is exploited:** Use sara@hexacrm.local as the email and ' OR '1'='1 as the password — or put admin@hexacrm.local' OR '1'='1' -- in the email field to land as admin.
- **Business impact:** On a real CRM this hands an attacker the first account they target — often an admin — with no password at all: the full client list, deal values and revenue data from a single request.
- **Report title:** SQL Injection in Login Form Allows Authentication Bypass
- **Fix:** Use parameterised queries / prepared statements for all database access; never build queries by string concatenation.

### Brute Force — No Login Throttling
- **OWASP:** A07:2021 Auth Failures · **Difficulty:** Beginner · **Location:** `POST /login` · **Report severity:** High
- **What it is:** Without rate limiting or lockout, a login form is an unlimited password-guessing machine.
- **How it is exploited:** Send 10 failed logins for nadia@hexacrm.local — the 10th failure is still accepted for processing. The missing throttle is the finding.
- **Business impact:** Attackers can password-spray the whole sales team overnight; one weak password means full access to that rep's book of business and client contacts.
- **Report title:** No Rate Limiting or Account Lockout on Login Endpoint
- **Fix:** Rate-limit login attempts per account and per IP; add progressive delays / lockout and alerting on repeated failures.

### User Enumeration via Login & Reset Responses
- **OWASP:** A07:2021 Auth Failures · **Difficulty:** Beginner · **Location:** `POST /login, POST /forgot` · **Report severity:** Medium
- **What it is:** Differing authentication responses turn the login page into a directory of valid staff accounts.
- **How it is exploited:** Probe 5 different made-up emails across login and forgot-password — the app confirms which addresses are real as you go.
- **Business impact:** Attackers first harvest a list of real employee emails, then aim phishing and password attacks only at accounts that exist — far more effective, and it starts from your own login page.
- **Report title:** Account Enumeration Through Differing Authentication Responses
- **Fix:** Return one generic message ('Invalid credentials' / 'If the account exists, a reset email was sent') for every outcome.

### Weak / Default Credentials (Guest Account)
- **OWASP:** A07:2021 Auth Failures · **Difficulty:** Beginner · **Location:** `POST /login` · **Report severity:** High
- **What it is:** Default and leftover accounts bypass all password policy — they are the first thing an attacker tries.
- **How it is exploited:** Log in with guest@hexacrm.local / guest — a shipped-default account that was never disabled.
- **Business impact:** A forgotten guest account gives an attacker a legitimate foothold inside the CRM on day one, ready to abuse every other flaw in this lab.
- **Report title:** Default Guest Account With Trivial Password Still Active
- **Fix:** Remove or disable default / trial accounts; force unique strong passwords at first login and audit dormant accounts.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 Auth Failures · **Difficulty:** Intermediate · **Location:** `POST /forgot, POST /reset` · **Report severity:** High
- **What it is:** A reset token is a temporary password — if it can be predicted, account takeover needs no access to the victim's mailbox.
- **How it is exploited:** Request a reset for yourself, note the token, then request one for a colleague and predict their token by adding one. Use the predicted token while signed in as yourself.
- **Business impact:** Anyone who can guess the sequence can reset the admin's password and own the entire CRM, locking the real team out in the process.
- **Report title:** Password Reset Tokens Are Sequential and Predictable
- **Fix:** Generate reset tokens from a CSPRNG (>=128 bits of entropy), expire them quickly and make them single-use.

### Session Cookie Tampering (Unsigned Role Cookie)
- **OWASP:** A07:2021 Auth Failures · **Difficulty:** Intermediate · **Location:** `Cookie: crm_session -> GET /admin` · **Report severity:** Critical
- **What it is:** Anything the server trusts from the client — especially a role — must be signed or kept server-side.
- **How it is exploited:** Decode the cookie, change role to admin, re-encode it, then open /admin. The server believes the cookie, not the database.
- **Business impact:** Every sales rep (or anyone who steals a session cookie) can promote themselves to admin in seconds: user management, all data, total control.
- **Report title:** Unsigned Session Cookie Allows Role Tampering to Admin
- **Fix:** Keep roles server-side only; sign session tokens (e.g. HMAC) or use opaque server-side sessions, and verify on every request.


## Registration & Profile — 4 test(s)

### Mass Assignment — Self-Registration as Admin
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Location:** `POST /register, POST /profile` · **Report severity:** Critical
- **What it is:** Binding request bodies directly to account objects lets attackers set fields the UI never offered — like role.
- **How it is exploited:** POST /register with an extra field role=admin (or add role=admin to a /profile update) — the account becomes an administrator.
- **Business impact:** Anyone on the internet can register themselves as a CRM admin: no exploit tooling needed, just one extra form field.
- **Report title:** Mass Assignment Allows Privilege Escalation to Admin
- **Fix:** Bind only whitelisted fields on registration and profile updates; set role and other privileged fields server-side.

### Weak Password Policy (Tiny Passwords Accepted)
- **OWASP:** A07:2021 Auth Failures · **Difficulty:** Beginner · **Location:** `POST /register` · **Report severity:** Medium
- **What it is:** A password policy that accepts anything guarantees some accounts will have guessable passwords.
- **How it is exploited:** Register a new account with the password 'ab' — it is accepted immediately.
- **Business impact:** Combined with the missing login throttling, two-character passwords across the sales team are an open invitation to account takeover.
- **Report title:** No Minimum Password Strength Enforced on Registration
- **Fix:** Enforce a minimum length (>=10 characters) and block known-common passwords at registration and password change.

### Stored XSS via Display Name (Reaches Admin View)
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate · **Location:** `POST /profile -> header, GET /admin/users` · **Report severity:** High
- **What it is:** Stored XSS in a profile field turns every viewer of that profile — including admins — into a victim.
- **How it is exploited:** Set your profile name to <script>alert(1)</script> — it is stored and rendered raw in the header and in /admin/users.
- **Business impact:** An attacker plants a script in their own name; when an admin opens the user list, the script runs in the admin's browser and can act with the admin's session.
- **Report title:** Stored Cross-Site Scripting in User Display Name
- **Fix:** Output-encode all user-controlled data on every render; validate names on input as defence in depth.

### CSRF on Profile Update
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Location:** `POST /profile` · **Report severity:** Medium
- **What it is:** State-changing forms without a verified CSRF token can be submitted by any website the victim visits.
- **How it is exploited:** While signed in, POST /profile with a cross-site Origin header and no hx_tok field, changing your email — it is accepted.
- **Business impact:** A rep who browses a malicious page while signed in can have their account email silently changed — the first step to full account takeover via password reset.
- **Report title:** Cross-Site Request Forgery on Profile Update
- **Fix:** Require and verify a per-session CSRF token on every state-changing request; check Origin/Referer as defence in depth.


## Search — 2 test(s)

### SQL Injection in Global Search (Full CRM Dump)
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate · **Location:** `GET /search` · **Report severity:** Critical
- **What it is:** Injection in a search box is a database-read primitive: one request can return records the user could never list normally.
- **How it is exploited:** Search for ' OR '1'='1 — the results list every rep's leads, contacts and companies, not just yours.
- **Business impact:** A single search request dumps the entire client database — every rep's leads and contacts — ready to be sold to a competitor or used for targeted phishing.
- **Report title:** SQL Injection in Search Returns All Users’ CRM Records
- **Fix:** Parameterise all queries; scope search results to the requester's authorised records server-side.

### Reflected XSS in Search Results
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner · **Location:** `GET /search` · **Report severity:** Medium
- **What it is:** Reflected input that is echoed unescaped executes in the victim's browser when they open a crafted link.
- **How it is exploited:** Search for <script>alert(1)</script> and view the page source: the payload sits unescaped in the results heading.
- **Business impact:** An attacker emails a rep a 'search link'; opening it runs script in the rep's authenticated CRM session — actions and data theft follow.
- **Report title:** Reflected Cross-Site Scripting in Search Results
- **Fix:** Output-encode all reflected input; add a Content-Security-Policy as defence in depth.


## Leads & Contacts — 2 test(s)

### IDOR — Read Another Rep's Lead
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Location:** `GET /leads/{id}` · **Report severity:** High
- **What it is:** Hiding records in lists is not authorisation — every object access must check ownership server-side.
- **How it is exploited:** Open a lead that belongs to Rahim (e.g. /leads/2) while signed in as Sara — his lead, phone and email are served to you.
- **Business impact:** Reps can read the whole company's lead pool: a departing employee can walk away with every prospect's contact details.
- **Report title:** Insecure Direct Object Reference on Lead Records
- **Fix:** Enforce object-level authorisation on every record access (owner or admin), for reads and writes alike.

### Lead Theft via Owner Mass Assignment
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Location:** `POST /leads/{id}/update` · **Report severity:** High
- **What it is:** If the server accepts an owner field from the client, record ownership — and the commission attached to it — is up for grabs.
- **How it is exploited:** POST to another rep's lead update with ownerId set to your own user id — the lead is reassigned to you.
- **Business impact:** A dishonest rep can silently steal the best leads (and their future deals) from colleagues days before they close.
- **Report title:** Lead Reassignment via Mass Assignment (Lead Theft)
- **Fix:** Whitelist editable fields per role; ownership changes must require manager/admin rights and be audit-logged.


## Deals & Pipeline — 4 test(s)

### IDOR — Read Another Rep's Deal
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Location:** `GET /deals/{id}` · **Report severity:** High
- **What it is:** Deal data is commercially sensitive; object-level authorisation must cover reads, not just edits.
- **How it is exploited:** Open /deals/2 (Rahim's big deal) as Sara — the full deal is served.
- **Business impact:** Anyone with a login can map the company's entire pipeline: who is buying, for how much, and at what stage — priceless to a competitor.
- **Report title:** Insecure Direct Object Reference on Deal Records
- **Fix:** Enforce object-level authorisation on every deal access (owner or admin).

### Deal Value Tampering by a Non-Owner
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Location:** `POST /deals/{id}/update` · **Report severity:** High
- **What it is:** Write endpoints need the same ownership checks as reads; otherwise your reporting data is fiction.
- **How it is exploited:** POST an update to Rahim's deal setting value=1 — the server accepts your number for his deal.
- **Business impact:** Forecasts, board reports and commission calculations can be silently falsified — management makes decisions on numbers any rep can edit.
- **Report title:** Unauthorised Modification of Other Reps' Deal Values
- **Fix:** Check ownership (or admin role) on every write; validate values server-side and audit-log all changes.

### Deal Owner Mass Assignment (Deal Theft)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Location:** `POST /deals/{id}/update` · **Report severity:** High
- **What it is:** Ownership fields must never be client-writable outside a dedicated, authorised transfer flow.
- **How it is exploited:** POST /deals/4/update with ownerId=2 — Rahim's $89k deal moves into Sara's pipeline.
- **Business impact:** High-value deals can be reassigned the day before they close, diverting commission and corrupting every per-rep report.
- **Report title:** Deal Ownership Reassignment via Mass Assignment
- **Fix:** Whitelist editable fields; ownership transfer must be an explicit, authorised and logged action.

### Pipeline Manipulation — Stage Skipping Straight to 'Won'
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate · **Location:** `POST /deals/{id}/update` · **Report severity:** Medium
- **What it is:** Business workflows are security controls too: if the server doesn't enforce the state machine, the process is fiction.
- **How it is exploited:** Take your own Prospecting deal (deal 3) and POST stage=Won — it jumps straight to Won and inflates your won revenue.
- **Business impact:** Reps can fabricate 'won' revenue to hit targets and bonuses, while management reports phantom income to the board.
- **Report title:** Business-Logic Flaw Allows Skipping Pipeline Stages to 'Won'
- **Fix:** Enforce a server-side stage-transition state machine; require manager approval to close deals as Won.


## Notes & Activities — 2 test(s)

### IDOR — Read Another Rep's Private Note
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Location:** `GET /notes/{id}` · **Report severity:** High
- **What it is:** A 'private' flag means nothing unless the server enforces it on every read.
- **How it is exploited:** Open /notes/2 as Sara — Rahim's private note, including the confidential budget detail, is shown.
- **Business impact:** Negotiation ceilings, discount limits and internal assessments leak to anyone with a login — exactly the details clients trusted the CRM to protect.
- **Report title:** Private Notes Exposed Through Insecure Direct Object Reference
- **Fix:** Authorise every note read against the note's author, the linked record's owner and the privacy flag.

### Stored XSS in Note Body
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate · **Location:** `POST /notes -> deal & lead pages` · **Report severity:** High
- **What it is:** Any rich-text rendering of user input without sanitisation is a stored-XSS delivery system aimed at colleagues.
- **How it is exploited:** Add a note to one of your deals with body <img src=x onerror=alert(1)> — it is stored and rendered raw on the deal page.
- **Business impact:** A malicious note on a popular deal fires in every viewer's browser — including managers — enabling session theft and actions taken as the victim.
- **Report title:** Stored Cross-Site Scripting in CRM Notes
- **Fix:** Render note bodies as plain text (output-encode) or sanitise with a strict allowlist sanitiser.


## Import & Export — 2 test(s)

### Full Contact Database Export by Any Rep
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Location:** `GET /export/contacts.csv` · **Report severity:** Critical
- **What it is:** Bulk-export endpoints are data-exfiltration features unless they are role-gated and row-scoped.
- **How it is exploited:** As Sara, open /export/contacts.csv — you download every rep's contacts, not just yours.
- **Business impact:** The entire client contact database — the company's most valuable asset — leaves in a single click, with no alert and no trace.
- **Report title:** Unauthorised Export of the Entire Contact Database
- **Fix:** Restrict exports to admins, scope exported rows to the requester's authorisation, rate-limit and audit every export.

### CSV Formula Injection via Lead Import
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate · **Location:** `POST /import/leads` · **Report severity:** Medium
- **What it is:** CSV is code to a spreadsheet: unsanitised fields starting with =, +, - or @ become formulas on the victim's machine.
- **How it is exploited:** Import a lead whose name starts with = (e.g. =2+5) — it is stored verbatim, ready to execute as a formula when exported and opened.
- **Business impact:** A booby-trapped 'lead' imported today executes in a manager's spreadsheet tomorrow — a quiet path from data entry to workstation compromise.
- **Report title:** CSV / Formula Injection Through Lead Import
- **Fix:** Sanitise imported and exported CSV fields: prefix cells starting with =, +, -, @, tab or CR with a single quote.


## Reports — 1 test(s)

### IDOR — View Another Rep's Performance Report
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Location:** `GET /reports/rep/{id}` · **Report severity:** Medium
- **What it is:** Reports aggregate the most sensitive commercial data — they need the same authorisation as the records behind them.
- **How it is exploited:** Open /reports/rep/3 as Sara — Rahim's full performance report, deals and revenue are shown.
- **Business impact:** Competitors inside the company (or a phished account) can benchmark every rep's pipeline and target the biggest deals and clients.
- **Report title:** Insecure Direct Object Reference on Sales Performance Reports
- **Fix:** Authorise report access: reps see their own report; managers and admins see their team's.


## Admin Panel — 1 test(s)

### CSRF on Admin Role Management
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Advanced · **Location:** `POST /admin/users/{id}/role` · **Report severity:** High
- **What it is:** The more powerful the action, the more dangerous a missing CSRF check — role changes are account-takeover primitives.
- **How it is exploited:** As admin, POST /admin/users/4/role with role=admin, a cross-site Origin and no hx_tok — Nadia is promoted by a forged request.
- **Business impact:** One malicious page view by the CRM admin can silently promote an attacker's account to admin — game over for the whole platform.
- **Report title:** Cross-Site Request Forgery on Admin Role Changes
- **Fix:** Verify CSRF tokens on all admin actions; require re-authentication for role changes.


## Platform & API — 2 test(s)

### Predictable API Token (crm-<userId>)
- **OWASP:** A07:2021 Auth Failures · **Difficulty:** Intermediate · **Location:** `GET /api/leads` · **Report severity:** High
- **What it is:** An API token must be an unguessable secret; deriving it from a public identifier makes it a username, not a credential.
- **How it is exploited:** Sara's token is crm-2. Guess Rahim's and call /api/leads with header X-API-Key: crm-3 while signed in as Sara — his leads come back.
- **Business impact:** Anyone can script the whole CRM's data out through the API, one predictable token per employee — no password needed at all.
- **Report title:** Predictable API Tokens Allow Cross-User Data Access
- **Fix:** Issue random, high-entropy API tokens; store them hashed, scope them per user and support revocation.

### Missing HTTP Security Headers
- **OWASP:** A05:2021 Security Misconfiguration · **Difficulty:** Beginner · **Location:** `GET / (scanner-style probe)` · **Report severity:** Low
- **What it is:** Security headers are cheap, broad protection: without them the app can be framed for clickjacking and MIME-sniffed into executing uploads as code.
- **How it is exploited:** Send a request to / with the header X-Security-Audit: 1 (a scanner-style probe) — the response confirms every protective header is missing.
- **Business impact:** Attackers can embed the CRM in a hostile page and trick reps into clicking through real actions — with the rep's own session doing the work.
- **Report title:** Missing HTTP Security Headers
- **Fix:** Add Content-Security-Policy, X-Frame-Options / frame-ancestors, X-Content-Type-Options: nosniff, Referrer-Policy and HSTS (on HTTPS).
