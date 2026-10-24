# HexaCRM — Practice Guide (26 challenges)

Work feature by feature. Each challenge states a measurable objective and **3 graded hints** — reveal them one at a time (in the app's 🎯 Tests page, or read ahead here only when stuck). The in-app **Lab Coach** chatbot gives the walkthrough for a feature only after you have genuinely tried that feature at least 3 times.

Test accounts: admin@hexacrm.local / Admin@123 · sara@hexacrm.local / Sara@123 (user id 2) · rahim@hexacrm.local / Rahim@123 (user id 3) · nadia@hexacrm.local / Nadia@123 (user id 4).


## Login & Authentication

### SQL Injection — Login Bypass (Intermediate · A03:2021 Injection · POST /login)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. The login form builds its user lookup by pasting your input straight into a query string.
2. Classic payloads still work here: try making the WHERE clause always true in the email or password field.
3. Use sara@hexacrm.local as the email and ' OR '1'='1 as the password — or put admin@hexacrm.local' OR '1'='1' -- in the email field to land as admin.

**Walkthrough (read after trying):** Step by step: 1) Log out. 2) On /login enter email sara@hexacrm.local and password ' OR '1'='1 (or admin@hexacrm.local' OR '1'='1' -- in the email field). 3) Submit — the string-built query returns a user row and you are signed in without any real password. That bypass is what the server detects.

### Brute Force — No Login Throttling (Beginner · A07:2021 Auth Failures · POST /login)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Nothing slows you down here: no lockout, no CAPTCHA, no delay.
2. Script ten wrong passwords for one account and watch every attempt get processed.
3. Send 10 failed logins for nadia@hexacrm.local — the 10th failure is still accepted for processing. The missing throttle is the finding.

**Walkthrough (read after trying):** Step by step: 1) Pick nadia@hexacrm.local. 2) POST /login with a wrong password 10 times (a small curl loop works). 3) Every attempt is processed normally — the app never locks the account. The test flips when the 10th failure is still accepted.

### User Enumeration via Login & Reset Responses (Beginner · A07:2021 Auth Failures · POST /login, POST /forgot)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Compare the error messages: an unknown email and a wrong password do NOT get the same text here.
2. The forgot-password form is even more generous — it tells you outright whether an account exists.
3. Probe 5 different made-up emails across login and forgot-password — the app confirms which addresses are real as you go.

**Walkthrough (read after trying):** Step by step: 1) POST /login with a made-up email — note the 'no account' wording. 2) POST with a real email and a wrong password — different wording. 3) Repeat with 5 distinct fake emails across /login and /forgot; the app confirms existence each time and the test flips at 5 distinct probes.

### Weak / Default Credentials (Guest Account) (Beginner · A07:2021 Auth Failures · POST /login)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Old trial and guest accounts are rarely cleaned up in real CRMs.
2. This CRM still has its leftover guest account active, with the most predictable password possible.
3. Log in with guest@hexacrm.local / guest — a shipped-default account that was never disabled.

**Walkthrough (read after trying):** Step by step: 1) On /login use guest@hexacrm.local with password guest. 2) You are signed in — the account shipped with the product and was never removed.

### Predictable Password-Reset Token (Intermediate · A07:2021 Auth Failures · POST /forgot, POST /reset)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Ask for a reset for your own account, then read your lab mailbox (/mail) and study the token's shape.
2. The tokens are not random at all — they are issued from a simple counter.
3. Request a reset for yourself, note the token, then request one for a colleague and predict their token by adding one. Use the predicted token while signed in as yourself.

**Walkthrough (read after trying):** Step by step: 1) Sign in as Sara. 2) POST /forgot with Sara's email, open /mail and note her token (T100001-style). 3) POST /forgot with Rahim's email — his token is the next number in the sequence. 4) POST /reset with his predicted token and a new password while still signed in as Sara. The reset succeeds: the token was guessable.

### Session Cookie Tampering (Unsigned Role Cookie) (Intermediate · A07:2021 Auth Failures · Cookie: crm_session -> GET /admin)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Inspect the crm_session cookie — it is just base64. Decode it and see what the server trusts.
2. Your role travels inside the cookie, and nothing signs it.
3. Decode the cookie, change role to admin, re-encode it, then open /admin. The server believes the cookie, not the database.

**Walkthrough (read after trying):** Step by step: 1) Sign in as Sara and copy the crm_session cookie. 2) Base64-decode it — it contains your uid, name and role. 3) Change role to admin, re-encode, replace the cookie in your browser or curl jar. 4) Open /admin — full admin access with a rep account. The server detects the cookie role granting more than the account's real role.


## Registration & Profile

### Mass Assignment — Self-Registration as Admin (Intermediate · A01:2021 Broken Access Control · POST /register, POST /profile)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. The registration handler copies submitted fields onto the new account a little too faithfully.
2. Accounts have a role field. What happens if the form submits one too?
3. POST /register with an extra field role=admin (or add role=admin to a /profile update) — the account becomes an administrator.

**Walkthrough (read after trying):** Step by step: 1) Log out. 2) Submit the register form with an added field role=admin (e.g. curl -d 'name=X&email=x@x.local&password=Passw0rd!&role=admin'). 3) The account is created — and signed in — as an admin.

### Weak Password Policy (Tiny Passwords Accepted) (Beginner · A07:2021 Auth Failures · POST /register)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. How short a password will this CRM accept at sign-up?
2. There is no length or complexity check at all.
3. Register a new account with the password 'ab' — it is accepted immediately.

**Walkthrough (read after trying):** Step by step: 1) On /register create an account with the password 'ab'. 2) The account is created and signed in — the policy accepts anything, and the server records the weak-password finding.

### Stored XSS via Display Name (Reaches Admin View) (Intermediate · A03:2021 Injection · POST /profile -> header, GET /admin/users)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Your display name is shown in the header of every page — and in the admin user list — without escaping.
2. A payload saved once fires for everyone who views it, including admins.
3. Set your profile name to <script>alert(1)</script> — it is stored and rendered raw in the header and in /admin/users.

**Walkthrough (read after trying):** Step by step: 1) Sign in, open /profile. 2) Set your name to <script>alert(1)</script> and save (keep the form's hidden hx_tok field so only this test fires). 3) The payload is stored and echoed unescaped in the page header and the admin user table.

### CSRF on Profile Update (Intermediate · A01:2021 Broken Access Control · POST /profile)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. The app's own forms carry a hidden hx_tok marker — but the server never checks it.
2. A state-changing POST from another origin, without the marker, still goes through.
3. While signed in, POST /profile with a cross-site Origin header and no hx_tok field, changing your email — it is accepted.

**Walkthrough (read after trying):** Step by step: 1) Sign in as Sara. 2) From a terminal, POST /profile with her session cookie, header Origin: https://evil.example, a new email value, and NO hx_tok field. 3) The email changes — the server accepted a forged cross-site request.


## Search

### SQL Injection in Global Search (Full CRM Dump) (Intermediate · A03:2021 Injection · GET /search)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Normal search only searches your own book of business. The query builder has the same string-concatenation habit as the login.
2. Make the search condition always true and see whose records show up.
3. Search for ' OR '1'='1 — the results list every rep's leads, contacts and companies, not just yours.

**Walkthrough (read after trying):** Step by step: 1) Run a normal search first and note you only see your own records. 2) Search for ' OR '1'='1. 3) The results now include other reps' leads and contacts — the injected condition dumped the whole CRM view, and the server detects results containing other reps' records.

### Reflected XSS in Search Results (Beginner · A03:2021 Injection · GET /search)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Your search term is printed back at the top of the results page.
2. It is printed exactly as typed — tags and all.
3. Search for <script>alert(1)</script> and view the page source: the payload sits unescaped in the results heading.

**Walkthrough (read after trying):** Step by step: 1) Search for <script>alert(1)</script>. 2) The results page reflects it raw inside the 'Results for …' heading — a shared link with this search would execute in a victim's browser.


## Leads & Contacts

### IDOR — Read Another Rep's Lead (Beginner · A01:2021 Broken Access Control · GET /leads/{id})
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Lead URLs are simple sequential IDs.
2. Your list only shows your leads — but the detail page never checks ownership.
3. Open a lead that belongs to Rahim (e.g. /leads/2) while signed in as Sara — his lead, phone and email are served to you.

**Walkthrough (read after trying):** Step by step: 1) Sign in as Sara and note your own lead IDs from /leads. 2) Browse to /leads/2 — Rahim's lead. 3) His lead details, phone and email are fully served although you are neither the owner nor an admin.

### Lead Theft via Owner Mass Assignment (Intermediate · A01:2021 Broken Access Control · POST /leads/{id}/update)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. The lead update handler applies every field it is given — including one the UI barely shows.
2. A lead's ownerId decides whose pipeline it lands in. What if you post it yourself?
3. POST to another rep's lead update with ownerId set to your own user id — the lead is reassigned to you.

**Walkthrough (read after trying):** Step by step: 1) Note your user id (Sara = 2). 2) POST /leads/5/update with ownerId=2. 3) Rahim's lead is reassigned to you — it appears in your list and counts toward your pipeline.


## Deals & Pipeline

### IDOR — Read Another Rep's Deal (Beginner · A01:2021 Broken Access Control · GET /deals/{id})
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Same pattern as the leads: sequential IDs, no ownership check on the detail page.
2. Deal pages show value, stage and probability — exactly the intel a competitor wants.
3. Open /deals/2 (Rahim's big deal) as Sara — the full deal is served.

**Walkthrough (read after trying):** Step by step: 1) Sign in as Sara. 2) Open /deals/2. 3) Rahim's deal — value, stage, probability — is fully visible to you.

### Deal Value Tampering by a Non-Owner (Intermediate · A01:2021 Broken Access Control · POST /deals/{id}/update)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. The deal update endpoint never asks whether the deal is yours.
2. Values feed forecasts and commission — and anyone can rewrite them.
3. POST an update to Rahim's deal setting value=1 — the server accepts your number for his deal.

**Walkthrough (read after trying):** Step by step: 1) As Sara, note Rahim's deal 2 value ($54,000). 2) POST /deals/2/update with value=1. 3) The deal now shows $1 — a non-owner rewrote the company forecast, and the server detects the cross-owner write.

### Deal Owner Mass Assignment (Deal Theft) (Intermediate · A01:2021 Broken Access Control · POST /deals/{id}/update)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Just like leads, the deal update handler trusts an ownerId field.
2. Stealing the deal steals its value from the other rep's pipeline report — and their commission.
3. POST /deals/4/update with ownerId=2 — Rahim's $89k deal moves into Sara's pipeline.

**Walkthrough (read after trying):** Step by step: 1) As Sara (user id 2), POST /deals/4/update with ownerId=2. 2) The deal's owner changes to you — it now appears in your pipeline and your reports.

### Pipeline Manipulation — Stage Skipping Straight to 'Won' (Intermediate · A04:2021 Insecure Design · POST /deals/{id}/update)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Deals are supposed to move one stage at a time — and closing as Won should only happen from Negotiation.
2. The server accepts any stage you post, from anywhere.
3. Take your own Prospecting deal (deal 3) and POST stage=Won — it jumps straight to Won and inflates your won revenue.

**Walkthrough (read after trying):** Step by step: 1) Open your deal 3 (stage: Prospecting). 2) POST /deals/3/update with stage=Won. 3) The deal closes as Won instantly — no qualification, proposal or negotiation ever happened — and your won-revenue jumps.


## Notes & Activities

### IDOR — Read Another Rep's Private Note (Beginner · A01:2021 Broken Access Control · GET /notes/{id})
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Notes can be marked private — but privacy here is only a label.
2. The note page serves any note ID to any signed-in user.
3. Open /notes/2 as Sara — Rahim's private note, including the confidential budget detail, is shown.

**Walkthrough (read after trying):** Step by step: 1) Sign in as Sara. 2) Open /notes/2. 3) Rahim's note marked private — with the client's confidential budget ceiling — is fully readable.

### Stored XSS in Note Body (Intermediate · A03:2021 Injection · POST /notes -> deal & lead pages)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Notes are rendered as HTML on deal and lead pages so reps can use light formatting.
2. That means markup you save is markup the next viewer runs.
3. Add a note to one of your deals with body <img src=x onerror=alert(1)> — it is stored and rendered raw on the deal page.

**Walkthrough (read after trying):** Step by step: 1) Open one of your deals and add a note with body <img src=x onerror=alert(1)>. 2) Reload the deal page — the payload sits in the page unescaped, ready to fire for any viewer. The server detects the stored payload at save time.


## Import & Export

### Full Contact Database Export by Any Rep (Beginner · A01:2021 Broken Access Control · GET /export/contacts.csv)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. The export was built for admins migrating data. Who can actually call it?
2. The endpoint checks that you are signed in — and nothing else.
3. As Sara, open /export/contacts.csv — you download every rep's contacts, not just yours.

**Walkthrough (read after trying):** Step by step: 1) Sign in as Sara. 2) Open /export/contacts.csv. 3) The CSV contains all contacts across all reps — the server detects rows owned by other reps in your download.

### CSV Formula Injection via Lead Import (Intermediate · A03:2021 Injection · POST /import/leads)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Imported leads are later exported and opened in Excel by the sales team.
2. Spreadsheet applications execute cells that begin with certain characters.
3. Import a lead whose name starts with = (e.g. =2+5) — it is stored verbatim, ready to execute as a formula when exported and opened.

**Walkthrough (read after trying):** Step by step: 1) Open /import and paste a CSV row whose name is =2+5 (plus any email and company). 2) Import — the lead is stored with the formula intact. 3) When a rep later exports leads and opens the file, the formula executes in their spreadsheet application.


## Reports

### IDOR — View Another Rep's Performance Report (Beginner · A01:2021 Broken Access Control · GET /reports/rep/{id})
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Per-rep report URLs contain the rep's user id.
2. Your own report is under /reports — the per-rep URL pattern is easy to guess.
3. Open /reports/rep/3 as Sara — Rahim's full performance report, deals and revenue are shown.

**Walkthrough (read after trying):** Step by step: 1) Sign in as Sara and view your report at /reports. 2) Change the URL to /reports/rep/3. 3) Rahim's pipeline value, won revenue and deal list are displayed.


## Admin Panel

### CSRF on Admin Role Management (Advanced · A01:2021 Broken Access Control · POST /admin/users/{id}/role)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Admin actions change state with a simple POST — and the hx_tok marker is never verified there either.
2. If an admin's browser can be made to send the request, the server will obey it.
3. As admin, POST /admin/users/4/role with role=admin, a cross-site Origin and no hx_tok — Nadia is promoted by a forged request.

**Walkthrough (read after trying):** Step by step: 1) Sign in as the real admin. 2) POST /admin/users/4/role with role=admin, header Origin: https://evil.example and NO hx_tok field. 3) Nadia's role changes to admin — a forged cross-site request performed a privileged action, and the server detects it.


## Platform & API

### Predictable API Token (crm-<userId>) (Intermediate · A07:2021 Auth Failures · GET /api/leads)
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Your API token is shown on your profile. Look at its format.
2. Tokens follow a fixed pattern built from something you already know about other users.
3. Sara's token is crm-2. Guess Rahim's and call /api/leads with header X-API-Key: crm-3 while signed in as Sara — his leads come back.

**Walkthrough (read after trying):** Step by step: 1) Open /profile as Sara — her token follows the pattern crm-<userId>. 2) curl /api/leads with Sara's session cookie and header X-API-Key: crm-3. 3) The API returns Rahim's leads — the token was trivially guessable, and the server detects the cross-user token use.

### Missing HTTP Security Headers (Beginner · A05:2021 Security Misconfiguration · GET / (scanner-style probe))
**Objective:** perform the exploit so the server detects its real effect and ticks this test off (check /tests or /api/progress).

**Hints:**
1. Check what protective headers the app sends — any scanner flags this instantly.
2. There is no Content-Security-Policy, no X-Frame-Options, no X-Content-Type-Options.
3. Send a request to / with the header X-Security-Audit: 1 (a scanner-style probe) — the response confirms every protective header is missing.

**Walkthrough (read after trying):** Step by step: 1) curl -i http://127.0.0.1:3021/ with the extra header X-Security-Audit: 1. 2) Inspect the response: no CSP, no X-Frame-Options, no nosniff header — the audit probe flips the test.
