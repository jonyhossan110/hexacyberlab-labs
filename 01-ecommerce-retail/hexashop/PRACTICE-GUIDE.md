# HexaShop — Practice Guide (25 challenges)

Work feature by feature. Each challenge lists a measurable objective and **3 graded hints** — reveal them one at a time (in the app's 🎯 Tests page, or read ahead here only when stuck). The in-app Lab Coach chatbot gives the same guidance, but only after you have genuinely tried that feature at least 3 times.


## Login & Authentication

### SQL Injection — Login Bypass (Beginner · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The login form builds its SQL query by gluing your input into a string. What happens if your email contains a single quote?
2. Close the email string with a quote, then make the rest of the query a comment: -- 
3. Try email: ' OR '1'='1' -- with any password. Or target the admin directly: admin@hexashop.local' -- 

**Walkthrough (read after trying):** Step by step: 1) Open the login page. 2) In the email field enter: ' OR '1'='1' -- (keep the trailing space). 3) Type any password and submit — the query now matches the first user (admin) and never checks the password. Variant: admin@hexashop.local' -- logs you in as admin directly. The same flaw exists in POST /api/login.

### Brute Force — No Rate Limiting (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Nothing slows you down when a login fails. How many wrong passwords can you submit in a row?
2. There is no lockout, no delay and no CAPTCHA — a script can try thousands of passwords.
3. Make 10 failed login attempts for alice@test.local — the app keeps accepting them instantly. That is the flaw, proven.

**Walkthrough (read after trying):** Step by step: 1) Pick a target account, e.g. alice@test.local. 2) Submit a wrong password. 3) Repeat at least 10 times — observe that every attempt is processed instantly, with no lockout, delay or CAPTCHA. A real attack uses Burp Intruder or Hydra to try thousands per minute.

### User Enumeration via Forgot Password (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Ask for a password reset for an email that exists — then for one that does not. Does the app answer differently?
2. The forgot-password page openly confirms whether an account exists.
3. Try alice@test.local (exists) and nobody@example.com (does not) on /forgot and compare the two messages.

**Walkthrough (read after trying):** Step by step: 1) Go to /forgot and request a reset for alice@test.local — the app confirms the account (and even shows a reset link). 2) Request a reset for an address that is not registered. 3) Compare the messages: the app openly says no account exists for the second. That difference is the enumeration oracle.

### Weak Password Policy at Registration (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. How short can a new account password be?
2. The register form accepts almost anything — there is no length or complexity check.
3. Register a new account with a 1-character password. It is accepted and you are logged in.

**Walkthrough (read after trying):** Step by step: 1) Open /register. 2) Create an account with the password set to a single character, e.g. "a". 3) The account is created and you are logged straight in — no policy stood in the way.

### Default Administrator Credentials (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The shop itself tells you its demo accounts — and one of them is the administrator.
2. Check the login page: the credentials are printed right on it.
3. Log in as admin@hexashop.local / admin123. On a real site, shipped and documented default credentials are a Critical finding.

**Walkthrough (read after trying):** Step by step: 1) Read the login page — it prints the demo accounts. 2) Sign in with admin@hexashop.local / admin123. 3) You now hold the full admin panel. On a real engagement, publicly known defaults are reported as Critical.

### Predictable Password-Reset Token (Intermediate · A02 Crypto Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The reset token is a hash of something public. What do you know about every user? Their email address.
2. The token has a familiar 32-hex shape — the same shape as the password hashes in /api/users.
3. The token is exactly md5(email). Compute md5 of bob@test.local yourself and open /reset?email=bob@test.local&token=<that hash> — without ever requesting a reset.

**Walkthrough (read after trying):** Step by step: 1) Do NOT request a reset link for your target — that just hands you the answer. 2) Compute the MD5 of the target email, e.g. md5 of bob@test.local (one command in any terminal). 3) Browse to /reset?email=bob@test.local&token=<md5> and set a new password. 4) Log in as Bob. The token was predictable because it is only a hash of a public value.


## Search & Catalogue

### SQL Injection — Search (UNION) (Advanced · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The shop search glues your text into a LIKE clause. A quote changes the structure of the query.
2. UNION SELECT needs the same number of columns as the original query — products has 12 columns.
3. Try in the search box: ' UNION SELECT 1,2,3,4,5,6,7,8,9,10,11,12 -- and watch rows appear that are not products.

**Walkthrough (read after trying):** Step by step: 1) Search normally and note the result format. 2) Search for: ' UNION SELECT 1,2,3,4,5,6,7,8,9,10,11,12 -- — the count must match the products columns (12). 3) The page now renders rows that are not products. 4) Replace numbers with real columns from another table (users: id,email,password,name,phone,role,avatar,wallet,created_at — padded to 12) to extract data. /api/search and /api/product/<id> share the flaw.

### SQL Injection — Sort Parameter (ORDER BY) (Intermediate · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The sort value lands directly in ORDER BY. What if you supply your own SQL expression instead of a column name?
2. ORDER BY cannot be parameterized like a value — the app just pastes your text in.
3. Request /shop?sort=(CASE WHEN 1=1 THEN price ELSE id END) and see the ordering obey your expression.

**Walkthrough (read after trying):** Step by step: 1) Open /shop and sort normally — watch the sort= value in the URL. 2) Replace it with: (CASE WHEN 1=1 THEN price ELSE id END). 3) Products come back ordered by price — your expression executed inside the query. 4) Flip 1=1 to 1=2 and watch behaviour change: that true/false channel is boolean-based injection.

### Verbose SQL Error Disclosure (Beginner · A05 Misconfiguration)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The developers left database errors switched on. Break a query and read what the page tells you.
2. A single quote in the search box is enough to break it.
3. Search for just: ' — the page prints the SQL error AND the full query text. That text is a map for every other injection in this lab.

**Walkthrough (read after trying):** Step by step: 1) In the shop search, enter a single quote: ' 2) Submit. 3) The page answers with 'SQL Error:' plus the raw database error and the complete SQL statement — information no visitor should ever see. The product page (/product/abc) and the login fail the same way.

### Reflected XSS in Search (Beginner · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Your search text is echoed back on the results page. Is it encoded?
2. View the page source after searching for an HTML tag.
3. Search for <script>alert(1)</script> — it lands in the page unescaped and executes.

**Walkthrough (read after trying):** Step by step: 1) Search for <script>alert(document.domain)</script>. 2) The results page echoes your text inside "Results for:" with no escaping, and the script executes. 3) In a real attack this link is sent to a victim and runs in their logged-in session.


## Products & Reviews

### Stored XSS — Reviews, Q&A, Tickets, Profile Name (Intermediate · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Some text you save is later shown to other people — including admins. Where does the shop print stored text without escaping?
2. Reviews are the classic spot: the payload waits on the product page for the next visitor.
3. Post a review containing <script>alert(1)</script>. It is stored and fires for everyone who opens that product. The same flaw lives in Q&A, support tickets and your profile display name.

**Walkthrough (read after trying):** Step by step: 1) Open any product. 2) Submit a review whose text is <script>alert(1)</script> (or an <img src=x onerror=alert(1)> variant). 3) Re-open the product page — your payload executes from the database. 4) The same stored-payload pattern works in Q&A, in a support ticket (it fires in /admin/tickets) and in your profile display name (it fires site-wide in the header).


## Orders & Invoices

### IDOR — Orders, Invoices & Addresses (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Your order pages use simple sequential numbers. What stops you opening someone else's number?
2. Log in as Alice and look at her order URLs: /order/1 and /order/2.
3. Alice owns orders 1 and 2. Open /order/3 — that is Bob's order. The invoice, address view and /api/orders/<id> have the same flaw.

**Walkthrough (read after trying):** Step by step: 1) Log in as Alice and open /my-orders — her orders are #1 and #2. 2) Change the URL to /order/3. 3) Bob's order, items and delivery address are shown — no ownership check happens. 4) Repeat with /invoice/3, /address/1 (while logged in as Bob) and the JSON twin /api/orders/3.


## Cart & Checkout

### Price Tampering at Checkout (Beginner · A04 Insecure Design)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The checkout form carries the prices and the total inside hidden fields. Who says they are still true when they come back?
2. Intercept the checkout request (browser dev tools or Burp) and edit it before sending.
3. Add something to the cart, open checkout, then submit with total changed to 1.00 and the hidden price_ fields lowered. The order is created at your price.

**Walkthrough (read after trying):** Step by step: 1) Add a product to the cart and open /checkout. 2) Inspect the form: total, price_0, qty_0 are hidden inputs. 3) Change total to 1.00 (dev tools or an intercepting proxy) and place the order. 4) Open the order — it was recorded at your tampered price.

### Business Logic — Coupons, Gift Cards & Quantities (Intermediate · A04 Insecure Design)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Three small logic flaws stack up: quantities, coupons and gift cards. Probe each rule the shop assumes but never checks.
2. Coupons: what happens with two codes separated by a comma — or the same code on a second order? Gift cards: look at the code pattern. Quantities: try a negative number.
3. Working examples: cart quantity of -5; checkout coupon "WELCOME10,HEXA20" (both apply together); gift card HEXA-1001 — codes are sequential (HEXA-1001 to HEXA-1010).

**Walkthrough (read after trying):** Step by step — any one proves it: 1) Add an item with quantity -5 and watch the cart total drop. 2) At checkout enter coupon "WELCOME10,HEXA20" — both discounts apply together. 3) Reuse the same coupon on a second order — it works again. 4) Guess a gift card: codes are HEXA-1001 through HEXA-1010; enter one at checkout and $25 disappears from the total.


## Profile & Account

### CSRF — No Anti-CSRF Tokens (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. State-changing forms in this shop carry no token. If you are logged in and a malicious page auto-submits a form here, what stops it?
2. Nothing does — the session cookie rides along automatically.
3. From any other origin (or a bare HTTP client holding only the session cookie), POST to /profile/update with a new email — it just works. Even deletes ride on GET: /address/delete?id=...

**Walkthrough (read after trying):** Step by step: 1) Log in as Alice. 2) From a plain HTTP client (curl) send POST /profile/update carrying ONLY her session cookie — no other site cookie and no token — with changed name/email fields. 3) The profile is updated: the site cannot tell this request did not come from its own form. 4) Note the GET-based deletions (/address/delete, /admin/products/delete) — an <img> tag on any page would trigger them in a victim's browser.

### Mass Assignment — Profile Update (role & wallet) (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The profile form shows name, email and phone. Does the server only accept those fields — or anything else you add to the POST?
2. Try adding fields the form never offered.
3. POST /profile/update with extra fields role=admin and wallet=9999. The server binds them straight onto your user record.

**Walkthrough (read after trying):** Step by step: 1) Log in as a normal customer. 2) Send POST /profile/update with the usual fields PLUS role=admin and wallet=9999. 3) Open /profile: your role and wallet were rewritten by the server. 4) At your next login the session is even issued with the admin role — you are now a "real" admin.


## File Upload & Download

### Unrestricted File Upload (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Avatar and product-image uploads ask for a file — but do they check what kind of file it really is?
2. Uploaded files are served back from /uploads/ with a content type guessed from the extension.
3. Upload a file named x.html containing a script as your avatar. Then open /uploads/x.html — it is served as text/html and the script runs on the shop origin.

**Walkthrough (read after trying):** Step by step: 1) Create a text file x.html containing <script>alert(document.domain)</script>. 2) Upload it as your avatar on /profile (or as a product image in the admin panel). 3) Browse to /uploads/x.html — the shop serves it as HTML and the script executes in the shop origin. 4) SVG files with embedded script behave the same way.

### Path Traversal — Arbitrary File Read (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The /download endpoint turns a filename into a filesystem path. What if the name climbs out of its folder?
2. Try relatives: the handler joins your text to the shop folder without checking where it lands.
3. GET /download?file=server.js reads the application source itself. shop.db — the whole database — is reachable the same way.

**Walkthrough (read after trying):** Step by step: 1) Open /download?file=server.js — the full application source comes back. 2) Try /download?file=shop.db for the database file itself. 3) Add ../ segments to climb further up the filesystem. Nothing validates that the file lives in an allowed folder.

### SSRF — Server-Side URL Fetch (Intermediate · A10 SSRF)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Two features make the server fetch a URL you supply: avatar-from-URL and the admin product import. The server will happily talk to itself.
2. Point the fetch at the shop's own internal pages — /debug is a rich target.
3. POST /profile/avatar-url with url=http://localhost:3000/debug, or as admin use /admin/import-url against http://127.0.0.1:3000/api/users and read what the server fetched for you.

**Walkthrough (read after trying):** Step by step: 1) As a customer, use "Avatar from URL" on /profile with http://127.0.0.1:3000/api/users — the server fetches its own API. 2) As admin, /admin/import-url shows you the fetched content directly: try http://localhost:3000/debug. 3) The request was made by the server, from inside — that is SSRF.


## API & Tokens

### Sensitive Data Exposure — /api/users, /debug, /backup.sql (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Some doors were left wide open: an API that lists users, a debug page, a backup file. None of them ask who you are.
2. Start with GET /api/users — no login needed.
3. Then fetch /debug (environment variables plus the API secret) and /backup.sql (a full database dump). All three answer anonymous requests.

**Walkthrough (read after trying):** Step by step: 1) Log out completely. 2) GET /api/users — every user, with their MD5 password hash, no questions asked. 3) GET /debug — environment variables and the API token secret. 4) GET /backup.sql — a ready-made dump of users, products, orders and coupons.

### Weak API Token — alg=none & Guessable Secret (Advanced · A02 Crypto Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The API issues JWT-style tokens signed with a secret. Where have you already seen that secret?
2. /debug prints it. And the verifier trusts the token header more than it should.
3. Two roads: (1) build a token with header {"alg":"none"} and any payload — /api/me accepts it unsigned; (2) sign a forged admin payload with HMAC-SHA256 using the leaked secret.

**Walkthrough (read after trying):** Step by step: 1) Get a real token from POST /api/login and base64url-decode its payload to learn the format. 2) Road A: build header {"alg":"none","typ":"JWT"} and payload {"id":1,"email":"admin@hexashop.local","role":"admin"}, join with dots and no signature — GET /api/me accepts it. 3) Road B: sign any payload with HMAC-SHA256 using the secret leaked in /debug. Either way the API treats you as admin.


## Admin Panel

### Session Cookie Tampering — Role Escalation (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. After login, decode your session cookie. It is just base64 — what two things does it say about you?
2. The server trusts the role written inside the cookie instead of checking the database.
3. Your cookie decodes to "<id>:customer". Re-encode it as "<id>:admin" and reload /admin — the gate opens.

**Walkthrough (read after trying):** Step by step: 1) Log in as Alice and copy the session cookie. 2) Base64-decode it: it reads "2:customer". 3) Change it to "2:admin", re-encode, and replace the cookie in your browser. 4) Open /admin — the full dashboard appears. The server never asked the database what Alice's role really is. (This is also the combined session-tampering finding: the web session and the API token are two parallel client-trusted mechanisms.)

### Command Injection — Admin Ping Tool (Intermediate · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The ping tool builds a shell command out of your host input. Shells listen to more than hostnames.
2. Chain a second command with a shell separator.
3. In /admin/ping enter: 127.0.0.1; echo PWNED (&& and | work too). The extra command's output appears in the result — the shell obeyed you, not the app.

**Walkthrough (read after trying):** Step by step: 1) Get admin (a real admin login, or the cookie-tampering test first). 2) Open /admin/ping. 3) Enter the host: 127.0.0.1; id — or append ; ls. 4) The result page shows the injected command's output: the app concatenated your text straight into a shell command.


## Platform & Configuration

### Open Redirect — /go & Login next (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Links that bounce you elsewhere take the destination from the URL. Does anything check where "elsewhere" is?
2. The /go endpoint and the login form's next field both trust the supplied address.
3. Open /go?url=https://example.com — you land there. A phishing mail can do the same with the login page: log in, end up on a lookalike site.

**Walkthrough (read after trying):** Step by step: 1) Browse to /go?url=https://example.com — the shop 302-redirects you off-site with no check at all. 2) Same trick via /login?next=https://example.com — after a successful login you are delivered to the external site.

### Security Misconfiguration — CORS & Missing Headers (Beginner · A05 Misconfiguration)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Send a request with a foreign Origin header and read the response headers carefully.
2. The shop reflects ANY origin back with credentials allowed — and sets no X-Frame-Options or CSP.
3. Request the homepage with header Origin: https://evil.example — Access-Control-Allow-Origin echoes your evil origin with Allow-Credentials: true. The pages can also be framed by anyone (clickjacking).

**Walkthrough (read after trying):** Step by step: 1) Request any page with the header Origin: https://evil.example. 2) Read the response: Access-Control-Allow-Origin repeats YOUR origin and Access-Control-Allow-Credentials is true — a browser would let evil.example read responses as the victim. 3) Check for X-Frame-Options and Content-Security-Policy: both are missing, and a Server banner advertises the stack.
