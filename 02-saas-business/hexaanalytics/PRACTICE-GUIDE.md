# HexaAnalytics — Practice Guide (25 challenges)

Work feature by feature. Each challenge lists a measurable objective and **3 graded hints** — reveal them one at a time (in the app's 🎯 Tests page, or read ahead here only when stuck). The in-app Lab Coach chatbot gives the same guidance, but only after you have genuinely tried that feature at least 3 times. **Objective for every challenge:** perform the exploit so the server detects the real effect and the test flips to ✓ on the 🎯 Tests page.

## Login & Authentication

### SQL Injection Login Bypass (Beginner · A03 Injection)
**Hints:**
1. The login form builds its query by gluing your input straight into a string. What happens if your "email" is not an email at all?
2. A classic tautology makes a WHERE clause true for every row: quote, OR, a comparison that is always true.
3. Try email: ' OR '1'='1 — with any password. The query matches the first user in the table.

**Walkthrough (read after trying):** Step by step: 1) Open /login. 2) Enter the email ' OR '1'='1 and any password. 3) Submit — you are logged in as the platform admin, because the query became "WHERE email='' OR '1'='1'" and matched the first row.

### Brute Force — No Rate Limiting or Lockout (Beginner · A07 Authentication Failures)
**Hints:**
1. Count how many wrong passwords the login accepts for one account. Does anything slow down or lock?
2. Ten wrong passwords in a row is a good probe — a protected login would have stopped you long before.
3. Script it: POST /login ten times with a wrong password for nadia@hexaanalytics.local. The 10th is still processed normally.

**Walkthrough (read after trying):** Step by step: 1) Pick a real account, e.g. nadia@hexaanalytics.local. 2) POST /login with a wrong password 10 times (curl in a loop). 3) Notice every attempt is processed with the same friendly error — no delay, no CAPTCHA, no lockout. The test passes at the 10th accepted failure.

### User Enumeration via Login & Forgot-Password Responses (Beginner · A07 Authentication Failures)
**Hints:**
1. Compare the error for an email that exists with one that does not — on the login form first.
2. Now compare the forgot-password answers for the same two emails. Helpful, isn't it?
3. Probe both ways (real email + wrong password, and a made-up email) on /login or /forgot and read the difference: "No account found" vs "Incorrect password".

**Walkthrough (read after trying):** Step by step: 1) POST /login with a made-up email — the answer names the problem: no such account. 2) POST /login with nadia@hexaanalytics.local and a wrong password — a different answer confirms the account exists. 3) /forgot behaves the same way. Doing both probes completes the test.

### Weak / Default Credentials on a Seeded Account (Beginner · A07 Authentication Failures)
**Hints:**
1. SaaS products ship with trial and demo accounts. Vendors pick very guessable passwords for them.
2. The account demo@hexaanalytics.local exists. What would a vendor set as its password — the account name plus something short?
3. Try demo@hexaanalytics.local with the password demo123. It was never changed after installation.

**Walkthrough (read after trying):** Step by step: 1) Go to /login. 2) Sign in as demo@hexaanalytics.local with password demo123. 3) You are in — the seeded demo account was never rotated.

### Predictable Password-Reset Token (Intermediate · A07 Authentication Failures)
**Hints:**
1. Ask for a password reset and study the flow. The emailed token has to come from somewhere — is it random, or computed?
2. The token is a simple encoding of something you already know about the victim. Think hex, not randomness.
3. The token is the hex encoding of the account email. Compute it for vera@hexaanalytics.local and POST it to /reset with a new password.

**Walkthrough (read after trying):** Step by step: 1) The reset token is hex(email). For vera@hexaanalytics.local compute the hex of the email string (e.g. printf 'vera@hexaanalytics.local' | xxd -p). 2) POST /reset with that token and a new password. 3) Log in as Vera with the new password — full account takeover without email access.

### Session Cookie Tampering — Client-Side Role Trusted (Intermediate · A01 Broken Access Control)
**Hints:**
1. Look at the ha_session cookie after logging in. It is not signed — it is just encoded. What is inside?
2. Base64-decode it: your identity AND your role travel in the cookie and the server believes them.
3. Decode the cookie, change "role" to "admin", re-encode, and visit /admin. The server never checks the database.

**Walkthrough (read after trying):** Step by step: 1) Log in as vera@hexaanalytics.local (a viewer). 2) Copy the ha_session cookie and base64-decode it — it is plain JSON with your role. 3) Change "role":"viewer" to "role":"admin", re-encode base64url, replace the cookie. 4) Open /admin — you are treated as admin while your real account is still a viewer.

## Registration & Profile

### No Password Policy at Registration (Beginner · A07 Authentication Failures)
**Hints:**
1. Register a new account. What is the shortest password the form accepts?
2. There is no minimum at all. Even a single character works.
3. POST /register with password "a". The account is created and logged in.

**Walkthrough (read after trying):** Step by step: 1) Open /register. 2) Create an account with the password "a" (one character). 3) It is accepted — no policy exists.

### Mass Assignment — Self-Promotion via Registration Fields (Intermediate · A01 Broken Access Control)
**Hints:**
1. The registration endpoint binds the whole request body to the new user object. What fields does a user normally never get to choose?
2. The form shows name/email/password — but the server reads more keys from the POST than the form sends.
3. POST /register with an extra field role=admin. Your new account is created as a platform admin.

**Walkthrough (read after trying):** Step by step: 1) POST /register with name, email, password AND the extra field role=admin. 2) The server copies every field onto the new user — including the role. 3) Your brand-new account is a platform admin.

### Stored XSS in Display Name (Intermediate · A03 Injection)
**Hints:**
1. Your display name is shown to teammates in the header and team list. Is it encoded anywhere?
2. Profile update saves the name exactly as typed — HTML included.
3. Set your profile name to <script>alert(1)</script> (or an <svg onload> payload) and save. It is stored and rendered raw to other users.

**Walkthrough (read after trying):** Step by step: 1) Log in and open /profile. 2) Set your display name to <script>alert(1)</script> and save (include the hx_tok field from the form). 3) The payload is stored and rendered unescaped in the header and team list — it fires for anyone who views it.

### CSRF on Profile Update (Intermediate · A01 Broken Access Control)
**Hints:**
1. The profile form carries a hidden marker field — but does the server actually verify it?
2. A state-changing POST that arrives from another origin, or without the marker, should be rejected. Test whether it is.
3. While logged in, POST /profile from a foreign Origin (e.g. Origin: https://evil.example) with no hx_tok field and a new name. The change is applied anyway.

**Walkthrough (read after trying):** Step by step: 1) Note the hx_tok hidden field in the /profile form. 2) Send POST /profile with a new name, a foreign Origin header and NO hx_tok. 3) The server applies the change — it never verified the marker. That is CSRF.

## Dashboards

### Cross-Account Dashboard IDOR (Beginner · A01 Broken Access Control)
**Hints:**
1. Dashboards live at /dashboard/<id> with small sequential ids. Whose dashboards can you open?
2. Your workspace is account 1. Dashboard 2 belongs to another company — try the URL directly.
3. Log in as Nadia (account 1) and open /dashboard/2. The Globex executive KPIs render with no ownership check.

**Walkthrough (read after trying):** Step by step: 1) Log in as nadia@hexaanalytics.local (Northwind). 2) Open /dashboard/2. 3) Globex Media's executive dashboard is served — the handler never compares the dashboard's account with yours.

### Reflected XSS in Dashboard Filter (Beginner · A03 Injection)
**Hints:**
1. The dashboard filter echoes your search text back into the page ("Filter: …"). Does it encode it?
2. Put HTML in the q parameter of a dashboard URL and view the source.
3. Open /dashboard/1?q=<script>alert(1)</script> — the payload lands in the page unescaped.

**Walkthrough (read after trying):** Step by step: 1) Log in. 2) Visit /dashboard/1?q=<script>alert(1)</script>. 3) The page reflects the q value raw — the script executes in your session.

## Datasets & Exports

### Cross-Account Dataset IDOR (Beginner · A01 Broken Access Control)
**Hints:**
1. Datasets are numbered like everything else here. Dataset 2 is not yours.
2. The dataset page loads by id only. Your account is never compared.
3. As Nadia (account 1), open /dataset/2 — Globex's raw campaign data is displayed.

**Walkthrough (read after trying):** Step by step: 1) Log in as Nadia (account 1). 2) Open /dataset/2. 3) Globex Media's dataset rows are served with no ownership check.

### Cross-Account Data Export IDOR (Intermediate · A01 Broken Access Control)
**Hints:**
1. Viewing is bad; exporting is worse — it is the exfiltration path. The export route hangs off the dataset id.
2. Try /dataset/<id>/export?format=csv for a dataset that is not yours.
3. As Nadia, request /dataset/2/export?format=csv — Globex's full dataset downloads as a file.

**Walkthrough (read after trying):** Step by step: 1) Log in as Nadia (account 1). 2) GET /dataset/2/export?format=csv. 3) The full Globex dataset downloads — export checks neither owner nor anything else.

### Viewer Role Can Export Data (Broken Function-Level Authorisation) (Intermediate · A01 Broken Access Control)
**Hints:**
1. Vera is a viewer: she may look, but exporting should be above her pay grade. Is it?
2. The export endpoint checks login — but does it check the role?
3. Log in as vera@hexaanalytics.local and export dataset 1 as CSV. It works.

**Walkthrough (read after trying):** Step by step: 1) Log in as vera@hexaanalytics.local (role: viewer). 2) GET /dataset/1/export?format=csv. 3) The file downloads — the endpoint never checks that viewers may not export.

## Report Builder

### Report Saved into Another Account via accountId Tampering (Intermediate · A01 Broken Access Control)
**Hints:**
1. The builder's save handler reads more of the POST than the form shows — including which account the report belongs to.
2. Your session says account 1. The request body can disagree.
3. POST /reports with the extra field accountId=2. The report is filed inside Globex's workspace.

**Walkthrough (read after trying):** Step by step: 1) Log in as Nadia (account 1). 2) POST /reports (the builder) with a name, datasetId 1, and accountId=2. 3) The saved report belongs to Globex — the server trusted the body over your session.

### Report Builder Filter Injection Leaks Cross-Account Data (Advanced · A03 Injection)
**Hints:**
1. The builder glues your filter value into its internal query the same careless way the login does.
2. Your account filter is part of that same query string. Break out of the value and make the whole condition true.
3. Build a report on dataset 1 with filter field 'region' and value ' OR '1'='1 — the results stop being only yours.

**Walkthrough (read after trying):** Step by step: 1) Log in as Nadia. 2) Open /reports/new, choose dataset 1, filter field region, and value ' OR '1'='1. 3) Run it — the account condition is neutralised and the report contains Globex rows too. Cross-tenant injection, detected server-side.

## Reports & Sharing

### Cross-Account Saved Report IDOR (Beginner · A01 Broken Access Control)
**Hints:**
1. Saved reports have sequential ids too. Report 2 is Globex's confidential one.
2. Open it directly and see whether ownership is checked.
3. As Nadia, GET /report/2 — the confidential Globex revenue report renders in full.

**Walkthrough (read after trying):** Step by step: 1) Log in as Nadia. 2) Open /report/2. 3) Globex's confidential report is served — no ownership check on saved reports either.

### Guessable Share-Link Token Exposes Private Report (Intermediate · A01 Broken Access Control)
**Hints:**
1. Share links look like /share/shr_1001. What do you suppose shr_1001 is — random, or a counter?
2. It is a counter. The seeded link to Globex's PRIVATE report is one of the first ever issued.
3. Without logging in, open /share/shr_1001 — the private Globex report is served to the world.

**Walkthrough (read after trying):** Step by step: 1) Log out. 2) Guess the token format: shr_ plus a small number, starting at 1001. 3) GET /share/shr_1001 — Globex's private report renders for an anonymous visitor.

### Share-Link Enumeration (No Throttling on Token Lookups) (Intermediate · A04 Insecure Design)
**Hints:**
1. Even without knowing the format, how fast can you probe tokens? Count your attempts — does anything resist?
2. Five different token guesses in a few seconds is a solid probe.
3. Request five distinct /share/<token> values in a row. All are answered instantly; nothing throttles or logs.

**Walkthrough (read after trying):** Step by step: 1) GET /share/shr_2001, shr_2002, shr_2003, shr_2004, shr_2005 in quick succession. 2) Every probe is answered at full speed — the 5th distinct probe completes this test.

### Revoked Share Link Still Works via Embed Route (Advanced · A01 Broken Access Control)
**Hints:**
1. Share a report, then revoke the link and confirm /share/<token> is dead. Is that the only door to it?
2. There is a second route built for embedding reports into other pages. Does it know about revocation?
3. Revoke report 1's link, then open /embed/shr_1002 — the "revoked" report still renders.

**Walkthrough (read after trying):** Step by step: 1) Log in as Nadia; report 1 already has link shr_1002. 2) POST /report/1/revoke-share. 3) /share/shr_1002 now returns 410 — but GET /embed/shr_1002 still serves the full report. Revocation only covered one route.

## Scheduled Reports

### Cross-Account Schedule Deletion IDOR (Intermediate · A01 Broken Access Control)
**Hints:**
1. Schedules are objects with ids, like everything else. Deletion is a POST to /schedule/<id>/delete.
2. Your schedules are yours. Schedule 2 belongs to Globex. Can you delete it anyway?
3. As Nadia, POST /schedule/2/delete. It is gone — no ownership check on a destructive action.

**Walkthrough (read after trying):** Step by step: 1) Log in as Nadia (account 1). 2) POST /schedule/2/delete — schedule 2 belongs to Globex. 3) It is deleted. The handler never checks whose it is.

## Admin Panel

### Admin User-List API Missing Authorisation (Intermediate · A01 Broken Access Control)
**Hints:**
1. The admin console has a JSON endpoint that feeds its user table: /admin/api/users. Who is allowed to call it?
2. The page checks roles. The API behind it was never given the same check.
3. Log in as Nadia (a plain analyst) and GET /admin/api/users — every user, email and password hash comes back.

**Walkthrough (read after trying):** Step by step: 1) Log in as Nadia (analyst, not admin). 2) GET /admin/api/users. 3) Full JSON of all users on the platform — the endpoint checks that you are logged in, never that you are an admin.

## Platform & API

### Unauthenticated Debug Endpoint Leaks Users, Keys & Tokens (Beginner · A05 Security Misconfiguration)
**Hints:**
1. Platforms ship diagnostics endpoints. Try the obvious one under /api.
2. No login is needed. That is the problem.
3. GET /api/debug as an anonymous visitor — users, password hashes, API keys and live share tokens come back as JSON.

**Walkthrough (read after trying):** Step by step: 1) Log out. 2) GET /api/debug. 3) The platform dumps its users, hashes, issued API keys and share tokens to an anonymous visitor.

### Predictable API Key Derived from Email (Advanced · A07 Authentication Failures)
**Hints:**
1. The JSON API at /api/datasets takes an x-api-key header. Issued keys are long — but the platform also honours a "legacy" key format.
2. The legacy key is a simple encoding of the account holder's email. Sound familiar?
3. Send x-api-key as the base64 of nadia@hexaanalytics.local. The API accepts it as Nadia's key.

**Walkthrough (read after trying):** Step by step: 1) Compute base64 of a user email: printf 'nadia@hexaanalytics.local' | base64. 2) GET /api/datasets with header x-api-key set to that value. 3) The API returns Nadia's account datasets — the "key" was never a secret.
