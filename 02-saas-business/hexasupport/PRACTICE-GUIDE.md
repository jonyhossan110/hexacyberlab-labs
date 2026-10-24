# HexaSupport — Practice Guide (25 challenges)

Work feature by feature. Each challenge lists a measurable objective and **3 graded hints** — reveal them one at a time (in the app's 🎯 Tests page, or read ahead here only when stuck). The in-app Lab Coach chatbot gives the same guidance, but only after you have genuinely tried that feature at least 3 times.


## Login & Authentication

### SQL Injection Login Bypass (Beginner · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The login form builds its account lookup by gluing your input straight into a query string — think about what a quote character does to it.
2. A classic tautology in the email field makes the lookup match a row without knowing any password.
3. Try email: ' OR '1'='1 — you should land in the first matching account (the supervisor's).

**Walkthrough (read after trying):** Step by step: 1) Log out. 2) On /login enter email ' OR '1'='1 and any password. 3) The string-built lookup matches the first row (the supervisor) and a session is created — the test flips when that bypass session is created.

### Brute Force — No Rate Limiting or Lockout (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Nothing slows down repeated login attempts — no counter, no delay, no lockout.
2. Script or repeat 10 wrong passwords for one account and watch: every attempt is processed the same as the first.
3. The test flips when the 10th failed attempt for the same account is still accepted for processing.

**Walkthrough (read after trying):** Step by step: 1) Pick an account, e.g. nadia@hexasupport.local. 2) Submit 10 wrong passwords in a row. 3) Notice the 10th is processed normally — no lockout, no CAPTCHA. The server marks the test at the 10th accepted failure.

### User Enumeration via Login & Forgot-Password Responses (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Compare the error for an email that exists (wrong password) with one that does not exist at all.
2. The forgot-password page answers differently too — one says the reset was sent, the other says there is no such account.
3. Probe one real and one fake email across login/forgot; the differing answers confirm which accounts exist.

**Walkthrough (read after trying):** Step by step: 1) Login with a real email and a wrong password — note the message. 2) Login with a made-up email — note the different message. 3) Do the same on /forgot. Once the server has seen you observe both answers, the test flips.

### Default Vendor Credentials Still Active (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Every support product ships with a built-in service account. This one was never disabled.
2. The account is support@hexasupport.local — the password is the product name followed by three digits everyone guesses first.
3. Try support@hexasupport.local / support123.

**Walkthrough (read after trying):** Step by step: 1) On /login use support@hexasupport.local with password support123. 2) You are in as an agent. The test flips on that successful login.

### Predictable Password-Reset Token (Intermediate · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Ask for a reset once and inspect the token format — it is built from things you already know about the account.
2. The token is rst-<user id>-<current minute>. User ids are sequential and minutes are public — no email access needed.
3. Compute the token for the supervisor (id 1) for the current minute and POST it straight to /reset without ever using /forgot for that account.

**Walkthrough (read after trying):** Step by step: 1) In a fresh browser (no /forgot visit for the target), compute token = rst-<uid>-<floor(unix time/60)>. The supervisor is uid 1. 2) POST /reset with that email, token and a new password. 3) It succeeds without any email — the server marks the test because the reset was never requested through /forgot from your address.

### Session Cookie Role Tampering (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Your session cookie is just base64 JSON — decode it and look at what it claims about you.
2. The server trusts the role written inside the cookie instead of checking the account record.
3. Decode hx_sess, change "role" to "supervisor", re-encode, and open /admin.

**Walkthrough (read after trying):** Step by step: 1) Log in as a customer and copy the hx_sess cookie. 2) Base64-decode it, set role to supervisor, re-encode, replace the cookie. 3) Open /admin — the page trusts the forged role and the server records the mismatch.


## Registration & Profile

### Weak Password Policy (1-Character Passwords) (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The registration form accepts almost anything as a password.
2. Try creating an account with a password of one to three characters.
3. If the account is created, the policy failure is proven — the test flips at registration.

**Walkthrough (read after trying):** Step by step: 1) Register a new account with password "a". 2) The account is created and you are logged in. The test flips because the weak password was accepted.

### Mass Assignment — Role Granted at Registration (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The register and profile handlers copy every submitted field onto the user record — including fields the form never shows.
2. Add a field the form does not offer: role. The handler will not stop you.
3. POST /register with role=supervisor added (e.g. via curl or a proxy) and check what the new account can open.

**Walkthrough (read after trying):** Step by step: 1) Intercept or craft the /register POST and add role=supervisor. 2) Submit — the new account is created with the supervisor role, copied blindly from your input. 3) The test flips when the privileged role lands.

### Stored XSS in Display Name (Intermediate · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Your display name is shown to agents in the customer directory and on tickets — and it is printed without escaping.
2. Set your name to an HTML payload, e.g. a script tag or an img with onerror.
3. When an agent opens the customer list, your "name" runs in their browser. The test flips when the payload is stored.

**Walkthrough (read after trying):** Step by step: 1) Go to /profile. 2) Set your display name to <script>alert(1)</script> and save. 3) The payload is stored raw and rendered unescaped in the agent customer directory — the test flips at store time.


## Tickets

### Ticket IDOR — Reading Another Customer's Ticket (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Ticket URLs are simple sequential numbers — and the page never checks that the ticket belongs to you.
2. Log in as one customer and open a ticket id that belongs to someone else.
3. Nadia owns tickets 1 and 3; Omar owns 2 and 4. As Omar, open /tickets/1.

**Walkthrough (read after trying):** Step by step: 1) Log in as Omar (omar@hexasupport.local). 2) Browse to /tickets/1 — Nadia's ticket. 3) It opens in full. The server records serving a ticket whose owner is not you.

### Internal Agent Notes Leaked to Customers (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Agents leave internal notes on tickets that customers must never see. The customer ticket view includes them anyway.
2. Log in as Nadia and open her billing ticket — look carefully at everything on the page.
3. Ticket 1 has an internal note about her expired card and retention risk. If you can read it as Nadia, the leak is proven.

**Walkthrough (read after trying):** Step by step: 1) Log in as Nadia. 2) Open ticket 1. 3) The agent's internal note is printed on the customer page. The server marks the test when it renders an internal note to a customer session.

### Reply Role Spoofing — Customer Posts as an Agent (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The reply form carries a hidden author_role field — and the server believes whatever it says.
2. Intercept your reply and change author_role from customer to agent.
3. Your message then appears as an official agent response on the ticket.

**Walkthrough (read after trying):** Step by step: 1) As a customer, reply on your ticket but tamper the hidden author_role field to agent (proxy or curl). 2) Submit. 3) The reply is stored and displayed as an agent response — the test flips.

### Ticket Status Tampering by Customer (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The reply POST handler reads a status field — the customer form just never renders it.
2. Add status=Closed to your reply submission on your own ticket.
3. If the ticket closes, a workflow control meant for staff was driven by the customer.

**Walkthrough (read after trying):** Step by step: 1) As a customer, POST a reply to your ticket including status=Closed. 2) The ticket closes. The server marks the test when a customer-driven status change is applied.

### Priority & SLA Tampering by Customer (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Same reply handler, another ignored field: priority. Changing it also recomputes the SLA deadline.
2. POST a reply with priority=Critical to jump the queue — or priority=Low on a rival's workflow to bury a ticket.
3. On your own Low ticket, set priority=Critical and watch the SLA due jump earlier.

**Walkthrough (read after trying):** Step by step: 1) As a customer, POST a reply to your own ticket including priority=Critical. 2) The priority changes and the SLA due is recomputed. The test flips on the applied change.

### Agent Acting Outside Their Queue (Reassign/Close) (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Agents are supposed to work their own queue. The assign and close handlers never check who a ticket belongs to.
2. Ticket 4 belongs to Ravi's queue. Log in as Alex and close it — or reassign it to yourself.
3. Only a supervisor should reach across queues. The handler lets any agent do it.

**Walkthrough (read after trying):** Step by step: 1) Log in as Alex (agent@). 2) Ticket 4 is assigned to Ravi. 3) POST /tickets/4/close (or assign it to yourself). It succeeds — the server marks the test when an agent acts on a ticket owned by another agent's queue.


## Search & Canned Responses

### SQL Injection in Ticket Search (Intermediate · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Ticket search glues your query into its lookup the same way login does.
2. A tautology in the search box makes the filter match everything — including tickets outside your scope.
3. Search for ' OR '1'='1 as a customer and count results that are not yours.

**Walkthrough (read after trying):** Step by step: 1) As a customer, search for ' OR '1'='1. 2) Results include tickets whose text never matched your term — the filter was bypassed. The server flips the test when an injected search returns out-of-scope rows.

### Reflected XSS in Search (Beginner · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The results page prints your search term back at the top — unescaped.
2. Put an HTML payload in the search box and view the page source.
3. Try <script>alert(1)</script> as the query.

**Walkthrough (read after trying):** Step by step: 1) Search for <script>alert(1)</script>. 2) The term is reflected raw into the results page. The server marks the test when the payload is reflected unescaped.

### Canned Response Tampering (Editing the Supervisor's Templates) (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Canned responses are shared templates — some belong to the supervisor. The edit handler never checks ownership.
2. As a regular agent, open the supervisor's "Refund policy reply" template and change its text.
3. POST /canned/1/edit with your own wording. If it saves, every future refund reply carries your text.

**Walkthrough (read after trying):** Step by step: 1) Log in as Alex. 2) Canned response 1 belongs to the supervisor. 3) POST /canned/1/edit with new body text. It saves — the test flips.


## Attachments

### Unrestricted File Upload — HTML Served Back (Intermediate · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Ticket attachments accept any filename and content — then the app serves them back from its own origin.
2. Attach a file named page.html containing a script to one of your tickets.
3. Open the served /uploads/page.html URL: it renders as HTML from the support site itself.

**Walkthrough (read after trying):** Step by step: 1) On your ticket, attach filename page.html with an HTML body. 2) Open /uploads/page.html. 3) It is served as text/html from the app origin — the test flips when the dangerous file is served.

### Path Traversal in File Download (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The /files download endpoint joins your name parameter onto the uploads folder — without cleaning it.
2. Walk out of the folder with ../ sequences.
3. Try /files?name=../server.js and read the application source.

**Walkthrough (read after trying):** Step by step: 1) Request /files?name=../server.js. 2) The server returns its own source code. The test flips when a path escaping the uploads folder is served.


## Admin Panel

### Supervisor Panel Open to Any Logged-In User (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The /admin panel checks that you are logged in — and nothing else.
2. As a plain customer, just browse to /admin.
3. The full supervisor panel, including every user's password, is served.

**Walkthrough (read after trying):** Step by step: 1) Log in as any customer. 2) Open /admin directly. 3) The supervisor panel renders. The test flips when a non-supervisor is served the panel.

### CSRF on Supervisor SLA Settings (Advanced · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The SLA settings form has a hidden origin marker field — but the handler never verifies it.
2. Submit the SLA change from another origin, or strip the hx_origin field entirely.
3. POST /admin/sla as the supervisor with an Origin of http://evil.example and new values. If they save, CSRF is proven.

**Walkthrough (read after trying):** Step by step: 1) Log in as the supervisor. 2) POST /admin/sla with changed hours, an Origin header of http://evil.example, and no valid hx_origin field. 3) The change is applied — the test flips.


## API & Platform

### Weak API Token (Base64 of Email) (Intermediate · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The API "key" for an account is just the account's email, base64-encoded — public information, encoded, not secret.
2. Compute base64 of any user's email and send it as the X-Api-Key header.
3. Try /api/tickets with the key derived from nadia@hexasupport.local.

**Walkthrough (read after trying):** Step by step: 1) Compute base64("nadia@hexasupport.local"). 2) GET /api/tickets with header X-Api-Key set to that value, no login cookie. 3) Her tickets are returned — the test flips on token-authenticated access.

### Unauthenticated Customer Data Exposure Endpoint (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. One API route was left open for "internal" use and never protected.
2. GET /api/customers needs no login and no key at all.
3. The response includes every user — with their plaintext password.

**Walkthrough (read after trying):** Step by step: 1) In a fresh browser with no cookies, open /api/customers. 2) Full user JSON, passwords included, is returned. The test flips on the fetch.

### Missing Security Headers (Beginner · A05 Misconfiguration)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Inspect any page response: there is no Content-Security-Policy, no X-Frame-Options, no X-Content-Type-Options.
2. The app can be framed by any site (clickjacking) and browsers will MIME-sniff its responses.
3. Simply load any page and check the response headers — their absence is the finding. The test flips when a page is served without them.

**Walkthrough (read after trying):** Step by step: 1) Load any page of the lab. 2) The response is served with no CSP, frame or nosniff headers. The server marks the test on that first unprotected response.
