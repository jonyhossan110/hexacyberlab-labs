# HexaElectro — Practice Guide (LAB 3)

This guide is generated from the lab's own test registry — it mirrors the **Missions page (/tests)** exactly.
Every challenge is measurable the same way: perform the exploit for real, and the lab itself flips the test to ✅
on /tests and raises your progress %. There is no "mark done" button. Hints are graded — use one at a time.

**How the lab works:** progress and attempts are saved in `progress.json` and survive restarts. The in-lab chatbot
gives step-by-step guidance for a feature only after you have genuinely tried that feature **at least 3 times**
(it counts your attempts). At 100% the completion page (/complete) reveals the key for Lab 4 and your certificate.

---

## Authentication (6 tests)

### User Enumeration via Auth Responses — Beginner
- **Class:** A07 Authentication Failures
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** Compare the login error for an email that exists with one that does not. Are they identical?
- **Hint 2:** Do the same comparison on the Forgot Password flow — one path reveals a reset link, the other stays vague.
- **Hint 3:** Once you have SEEN both variants (e.g. forgot for nadia@hexaelectro.local and for nobody@hexaelectro.local), enumeration is proven.
- **What it teaches:** Different error messages for "no such account" vs "wrong password" hand attackers a valid-account list for targeted attacks.

### Brute Force — No Rate Limiting on Login — Beginner
- **Class:** A07 Authentication Failures
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** How many wrong passwords can you try for one account in a row? Does anything slow you down or lock the account?
- **Hint 2:** Script it: 10+ failed logins for nadia@hexaelectro.local — watch for any lockout, CAPTCHA or delay.
- **Hint 3:** There is no throttle at all: the 10th (and 100th) failure is processed exactly like the first.
- **What it teaches:** Without rate limiting or lockout, a password is only as strong as the attacker's patience and wordlist.

### Default Administrator Credentials — Beginner
- **Class:** A07 Authentication Failures
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** The README documents the seeded admin account. Are its credentials the sort an installer would leave unchanged?
- **Hint 2:** Admin@123 follows the same predictable pattern as the lab documentation shows.
- **Hint 3:** Log in as admin@hexaelectro.local with the documented default password Admin@123 — that is the finding: shipped defaults still work.
- **What it teaches:** Default credentials are public knowledge. Any system reachable with its factory password is already compromised.

### SQL Injection Login Bypass — Intermediate
- **Class:** A03 Injection (SQLi)
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** The login also accepts a legacy string-built query path. What happens if your input contains a single quote?
- **Hint 2:** Try a classic always-true condition in the email field, e.g. ' OR '1'='1 — or comment out the password check with -- .
- **Hint 3:** POST /login with email = admin@hexaelectro.local' -- and any password: the query's password condition is commented out and you are logged in as admin.
- **What it teaches:** String-built SQL queries let attacker input change the query itself. Parameterised queries make input data, never code.

### Predictable Password-Reset Token — Intermediate
- **Class:** A07 Authentication Failures
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** Use Forgot Password once and look at the shape of the reset link you are shown. What varies between users?
- **Hint 2:** Tokens look like reset-<number>. Whose number is 1?
- **Hint 3:** Without requesting anything, browse to /reset?token=reset-1 and set a new password for the admin account.
- **What it teaches:** Reset tokens must be unguessable secrets. A token derived from a sequential user id is an open door labelled "reset".

### Role Tampering via Unsigned Cookie — Intermediate
- **Class:** A01 Broken Access Control
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** After login, inspect your cookies. One of them states your role in plain text. Who signs it? (Nobody.)
- **Hint 2:** The admin gate reads that client-controlled cookie instead of the server-side account.
- **Hint 3:** Set the role cookie to admin in your browser (DevTools → Application → Cookies) and reload /admin.
- **What it teaches:** Authorisation data must live server-side or be cryptographically signed. Anything the client can edit, the client controls.

## Registration & Profile (4 tests)

### Weak Password Policy at Registration — Beginner
- **Class:** A07 Authentication Failures
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** Register a new account. How short can the password be before the form complains?
- **Hint 2:** It never complains — try a single character.
- **Hint 3:** Create an account with password "a": the lab accepts it, proving there is no password policy at all.
- **What it teaches:** A password policy is the cheapest control there is. Without one, users pick passwords that fall to the first guessing attempt.

### Stored XSS via Display Name — Beginner
- **Class:** A03 Injection (Stored XSS)
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** Your display name is shown in the top navigation of every page. Is it encoded there?
- **Hint 2:** Set your profile name (or register) with a name like <script>alert(1)</script> and look at the header.
- **Hint 3:** The navigation renders the name RAW — the payload is stored and fires on every page you view, and would fire for anyone shown your name.
- **What it teaches:** Any user-controlled string rendered without output encoding is a stored XSS waiting for a viewer — ideally, for the victim, an admin.

### Mass Assignment — Self-Promotion via Profile Update — Intermediate
- **Class:** A01 Broken Access Control (Mass Assignment)
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** The profile form shows name, address, email. What other fields does the account object have that the form does not show?
- **Hint 2:** The update handler copies fields straight from your POST. Try adding a role field.
- **Hint 3:** POST /profile with role=admin added: your account's role is overwritten server-side — real admin, no cookie tricks.
- **What it teaches:** Binding request parameters directly to model objects lets attackers write fields the UI never offered. Allow-list updatable fields.

### CSRF on Profile Update — Intermediate
- **Class:** A01 Broken Access Control (CSRF)
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** The profile form carries no anti-CSRF token. What would stop a malicious page from submitting it for a logged-in victim?
- **Hint 2:** Nothing checks Origin/Referer either, and the session cookie has no SameSite attribute.
- **Hint 3:** POST /profile from a cross-site context (e.g. curl with Origin: https://evil.example) while logged in — the change is accepted.
- **What it teaches:** State-changing requests need an unguessable token (or strict SameSite cookies). Ambient cookie authority alone is forgeable.

## Catalogue & Search (2 tests)

### Reflected XSS in Search — Beginner
- **Class:** A03 Injection (Reflected XSS)
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** The search term is printed back on the results page ("Results for: …"). Encoded, or raw?
- **Hint 2:** Search for a harmless tag first and view the page source.
- **Hint 3:** Search for <script>alert(1)</script> — it is reflected unescaped into the page (and into the echoed query).
- **What it teaches:** Reflected input must be encoded for the context it lands in. "It's only a search box" is how phishing-grade XSS ships.

### SQL Injection in Product Search — Intermediate
- **Class:** A03 Injection (SQLi)
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** The Search page echoes the exact query it "ran". How is your input placed into it?
- **Hint 2:** A quote in the search term lands inside a string literal in that query. What does a ' OR '1'='1 do to the WHERE clause?
- **Hint 3:** Search for: ' OR '1'='1 — the condition becomes always true and the full catalogue is returned.
- **What it teaches:** Search boxes are database inputs. Concatenating them into queries is the same critical flaw whether the page is login or search.

## Cart & Checkout (4 tests)

### Price Tampering at Checkout — Beginner
- **Class:** A04 Insecure Design / Business Logic
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** Look at the Cart page form closely — the unit prices are editable form fields, not just text.
- **Hint 2:** What does the server do with the price you submit — or does it look the price up itself?
- **Hint 3:** Change price_8 to 1 in DevTools/Burp and place the order: you pay $1 for $199 headphones.
- **What it teaches:** Prices are server-side facts. Anything the client submits about money must be recomputed, never trusted.

### Coupon Reuse Without Limit — Beginner
- **Class:** A04 Insecure Design / Business Logic
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** ELECTRO10 gives 10% off. What records that YOU have already used it?
- **Hint 2:** Nothing does. Place one order with it — then simply place another.
- **Hint 3:** Use the same coupon on two separate orders: it applies in full both times.
- **What it teaches:** Promotions need a redemption ledger: per-code, per-user usage state enforced at checkout, not display logic.

### Negative Quantity Tampering — Intermediate
- **Class:** A04 Insecure Design / Business Logic
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** Quantity is a number the server believes. Does anything insist it be positive?
- **Hint 2:** The Add-to-Cart form has min="1" — but that is only a browser hint. Post the request yourself.
- **Hint 3:** POST /cart/add with qty=-3, then check out: the negative line REDUCES your order total.
- **What it teaches:** Quantities, like prices, are money. Validate ranges server-side: qty must be a positive integer within stock.

### Flash-Sale Race Condition (Overselling) — Advanced
- **Class:** A04 Insecure Design (Race Condition)
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** The FLASH DEAL has stock 2. Checkout checks stock, pauses ("payment processing"), then decrements. What fits inside that pause?
- **Hint 2:** Two buyers, two carts, each with 2× HexaBuds Pro. Timing is everything.
- **Hint 3:** Fire both checkouts in parallel (two cookie jars, background curl): both pass the stock check before either decrements — stock ends at −2.
- **What it teaches:** Check-then-act without a lock or transaction is a race. Stock, balances and coupons all need atomic reservation.

## Orders (1 tests)

### Order IDOR — Reading Other Customers' Orders — Beginner
- **Class:** A01 Broken Access Control (IDOR)
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** Order URLs are /order/<id> with sequential ids. The page checks you are logged in — but does it check the order is YOURS?
- **Hint 2:** Order #5001 already exists and is not yours (unless you are Nadia).
- **Hint 3:** Log in as Tanvir and open /order/5001: another customer's full order, serials included, is served.
- **What it teaches:** Authentication is not authorisation. Every object access must verify the object belongs to the requester.

## Trade-In (1 tests)

### Trade-In Value Tampering — Beginner
- **Class:** A04 Insecure Design / Business Logic
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** The trade-in form "estimates" your device value with a bit of JavaScript. Where does the number that becomes credit actually come from?
- **Hint 2:** The server stores whatever value arrives in the POST — the JS is just a suggestion.
- **Hint 3:** POST /tradein with grade=D and value=5000: $5,000 credit is applied to your next checkout.
- **What it teaches:** Valuations are server decisions. Client-side estimates are UX, not controls — credit must be computed and capped server-side.

## Warranty Centre (4 tests)

### Serial Lookup Leaks Owner PII (Unauthenticated) — Beginner
- **Class:** A01 Broken Access Control / Data Exposure
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** The warranty lookup endpoint answers JSON. Does it ask who you are first?
- **Hint 2:** Try it with NO cookies at all for a serial you know exists, like HE100001.
- **Hint 3:** curl /warranty/lookup?serial=HE100001 returns the product AND the owner's name and email — anonymously.
- **What it teaches:** Support tooling often leaks the most data. "Just a lookup" still needs authentication and minimal fields.

### Warranty Extension via Parameter Tampering — Beginner
- **Class:** A04 Insecure Design / Business Logic
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** The register form carries a hidden warranty_months field. Hidden from sight — but whose value is it?
- **Hint 2:** The server builds your warranty end date from that parameter.
- **Hint 3:** Register HE100010 with warranty_months=1200: cover until the year 2126 — a century of free warranty.
- **What it teaches:** Hidden fields are still client input. Durations, tiers and entitlements must come from server-side policy, never the request.

### Serial-Number Enumeration — Intermediate
- **Class:** A01 Broken Access Control (Predictable IDs)
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** Serials follow a pattern: HE plus six digits, counting up. What happens when you walk the number line?
- **Hint 2:** Probe five or more different serials through the lookup — each answers fully.
- **Hint 3:** HE100001…HE100005 and beyond each return a device record: the whole customer device registry is enumerable in minutes.
- **What it teaches:** Sequential identifiers plus a verbose lookup equals a bulk-export API. Unguessable references and rate limits break the chain.

### Warranty Claim IDOR (File & Read) — Intermediate
- **Class:** A01 Broken Access Control (IDOR)
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** Filing a claim asks for a serial. Does the server check the device belongs to you?
- **Hint 2:** Reading a claim (/warranty/claim/CLM-xxxx) — is ownership checked there either?
- **Hint 3:** As Tanvir, file a claim on Nadia's HE100001, then open her seeded claim CLM-1001: her name and email are shown.
- **What it teaches:** Both halves of an object flow need ownership checks — creation (write) and retrieval (read). One missing check is enough.

## Support Tickets (1 tests)

### Stored XSS in Support Tickets — Beginner
- **Class:** A03 Injection (Stored XSS)
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** Ticket subjects and bodies are printed back on the ticket page — and listed for staff. Encoded?
- **Hint 2:** Create a ticket whose body is a script payload and open the ticket.
- **Hint 3:** A body of <script>alert(1)</script> is stored and served raw — it fires for any viewer, including admins via /admin/tickets.
- **What it teaches:** Support queues are prime XSS targets because staff MUST open them. Everything user-supplied is hostile until encoded.

## Invoices (2 tests)

### Invoice Access Without Authorisation (IDOR) — Beginner
- **Class:** A01 Broken Access Control (IDOR)
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** Invoices live at /invoice/<id> with small sequential ids. Who is allowed to open one? Apparently: anyone.
- **Hint 2:** Invoice #1 belongs to Nadia. You do not need to be Nadia — or even logged in.
- **Hint 3:** Open /invoice/1 as another user (or anonymously): her invoice document is served.
- **What it teaches:** Uploaded documents are private objects. Serving them by guessable id without an ownership check leaks financial documents.

### Unrestricted Invoice Upload → Stored HTML Hosting — Intermediate
- **Class:** A03 Injection / Unrestricted Upload
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** The invoice upload accepts "file contents" as text. What types are rejected? (None.) And how is it served back?
- **Hint 2:** Uploaded content is returned with Content-Type: text/html from the shop's own origin.
- **Hint 3:** Upload invoice content containing <script>alert(2)</script> and open /invoice/<id> — your HTML/JS is hosted and executed.
- **What it teaches:** Uploads need type allow-lists, content checks, and safe serving (download headers, separate domain). Raw user HTML on your origin is stored XSS as a feature.

## Admin Panel (1 tests)

### Admin Pages Open to Any Customer (Broken Access Control) — Beginner
- **Class:** A01 Broken Access Control
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** /admin itself at least checks something. Do ALL admin pages? Compare /admin with /admin/inventory.
- **Hint 2:** Two admin pages check only that *someone* is logged in — never their role.
- **Hint 3:** As a plain customer, open /admin/inventory and /admin/claims: stock values and every customer's claims, no tampering needed.
- **What it teaches:** Authorisation must be enforced on every route, server-side, by default. One unguarded page undoes the whole model.

## APIs & Platform (1 tests)

### Customer Export API — Excess Data Exposure — Beginner
- **Class:** A03 / API3 Excess Data Exposure
- **Objective (measurable):** Carry out this exploit against the running lab until the test flips to ✅ on /tests and your progress rises. Half-measures (reading about it) do not count — the server must observe the success.
- **Hint 1:** Somewhere there is an API endpoint meant for internal tooling. It returns customers — all of them. Does it authenticate?
- **Hint 2:** Try /api/customers/export with no cookies at all.
- **Hint 3:** One anonymous GET returns every customer's name, email and device serials as JSON.
- **What it teaches:** APIs must authenticate and minimise: return only the fields the caller needs, only for callers allowed to have them.

---

## Combination chains (after the singles)

- **Enumerate → claim:** use serial enumeration + lookup PII to file warranty claims on strangers' devices.
- **Reset token → real admin:** guess `reset-1` instead of forging the role cookie.
- **CSRF → reset:** change a victim's email by CSRF, then use the reset flow against the new address.
- **Trade-in + price tamper:** mint credit, then set your own prices — zero-cost orders even if one flaw is later fixed.
- **Report it like a pentester:** pick any three completed tests and write client-style findings (title, severity, evidence, business impact, fix) — the /complete page shows how each finding is written in a real report.
