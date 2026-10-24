# HexaAutoParts — Intentional Vulnerabilities (Complete Map)

22 deliberate flaws, grouped by the feature they belong to — this is the lab's
full test registry. Every flaw is **detected by the lab itself** when you exploit
it for real: complete all 22 to reach 100% (see the in-app `/tests` mission page,
`/complete` debrief and the [PRACTICE-GUIDE.md](PRACTICE-GUIDE.md)). All locations
refer to `server.js`. The original 14 flaws are unchanged; flaws 15–22 were added
so that every feature carries every technique that applies to it.

---

## Feature: Login & Authentication

### A1. SQL Injection Login Bypass *(new)*
- **OWASP:** A03 Injection
- **Location:** `POST /login` (legacy string-built query path)
- **Exploit:** The login builds its "query" by concatenating your input and evaluating it naively. Email `admin@hexaautoparts.local' OR '1'='1` with any password makes the condition true for the admin row — a session is created with no password at all. The same pattern works in the password field for a known email.
- **Impact:** Full authentication bypass — attacker becomes admin in one request.

### A2. Brute Force — No Login Throttling *(new)*
- **OWASP:** A07 Identification & Authentication Failures
- **Location:** `POST /login` (absence of a control)
- **Exploit:** Submit 10, 100, 10,000 wrong passwords for one account — every attempt is processed at full speed. No rate limit, no lockout, no CAPTCHA. The lab counts the flaw once the 10th failure for an account is still accepted for processing.
- **Impact:** Password guessing becomes a matter of time and a wordlist; weak passwords fall first and get reused elsewhere.

### A3. User Enumeration via Password Reset *(new)*
- **OWASP:** A07 Identification & Authentication Failures
- **Location:** `POST /forgot`
- **Exploit:** Existing emails get "Reset link sent to …"; unknown emails get "No account with the email … exists". Submit one of each and compare — the difference is an oracle that confirms which emails are registered.
- **Impact:** Attackers build a verified target list of real accounts for phishing and credential attacks.

### A4. Weak / Predictable Password-Reset Token (was #12)
- **OWASP:** A07 Identification & Authentication Failures (CWE-337 predictable token)
- **Location:** `POST /forgot` — token = first 10 hex chars of the hex encoding of the email address
- **Exploit:** Compute the token yourself: `Buffer.from(email).toString('hex').slice(0,10)` — deterministic, no randomness, no expiry. Visit `/reset?email=sara@...&token=<computed>`, set a new password, log in as Sara. Works for the admin address too.
- **Impact:** Full account takeover of any user whose email is known.

---

## Feature: Registration & Profile

### R1. Mass Assignment — Self-Service Role Upgrade *(new)*
- **OWASP:** A01 Broken Access Control (mass assignment)
- **Location:** `POST /register` (`role` field)
- **Exploit:** The registration handler copies request fields onto the new account. Add `role=admin` (or `role=trade`) to the registration POST — the account is created with that role. The form never shows the field; the server accepts it anyway.
- **Impact:** Privilege escalation at the front door: anyone can register as admin.

### R2. No Password Policy at Registration *(new)*
- **OWASP:** A07 Identification & Authentication Failures
- **Location:** `POST /register`
- **Exploit:** Register with the password `x` — one character. It is accepted: there is no minimum length or complexity check anywhere.
- **Impact:** Accounts protected by guessable-in-one-try passwords across the whole customer base.

---

## Feature: Fitment Search

### F1. SQL-Injection-Style Fitment Search Bypass (was #9)
- **OWASP:** A03 Injection (SQL injection pattern, simulated legacy query layer)
- **Location:** `GET /fitment?q=...` ("Part finder" legacy search; the built query string is echoed on the page)
- **Exploit:** Search `brake' OR '1'='1` → the condition becomes always-true and **all 19 parts** are returned regardless of fitment filters. `x' OR category='Brakes` returns a whole category that the fitment filter would normally narrow.
- **Impact:** The classic injection lesson in this store's clothing: attacker-controlled input changes query logic → data exposure and a stepping stone to full database compromise in a real (SQL-backed) deployment.

### F2. Reflected XSS in Part Finder *(new)*
- **OWASP:** A03 Injection — Reflected Cross-Site Scripting
- **Location:** `GET /fitment?q=...` ("Results for:" heading)
- **Exploit:** Search for `<script>alert(1)</script>` — the results heading prints the term back **unescaped**, as live markup. A crafted search link executes in the browser of anyone who opens it.
- **Impact:** Session theft and phishing delivered from the store's own trusted pages.

---

## Feature: VIN Lookup

### V1. VIN Lookup — Excess Data Exposure (was #2)
- **OWASP:** A01 / A02 — Broken Access Control & excessive data exposure
- **Location:** `GET /vin?vin=...`
- **Exploit:** No login needed. Look up `HAP20261002` — you get Sara Ahmed's **name, home address, phone number and full service history**, not just vehicle details.
- **Impact:** Privacy breach of every registered keeper; the data enables targeted scams ("your Civic's headlight warranty…"), stalking, and social engineering of owners and garages.

### V2. VIN Enumeration — Sequential, Guessable Identifiers (was #3)
- **OWASP:** A01 Broken Access Control (predictable identifiers / enumeration)
- **Location:** `GET /vin?vin=...` + the seed VIN scheme `HAP2026` + 4-digit serial
- **Exploit:** VINs are sequential: `HAP20261001`, `...1002`, `...1003` … Step through five or more serials and the lab counts it; step through all of them and the whole registry (12 owners) is harvested in seconds, with no rate limit.
- **Impact:** Turns flaw V1 from a leak into a bulk data breach — the entire customer registry can be scraped without credentials.

---

## Feature: Product Q&A

### Q1. Stored XSS in Product Q&A (was #8)
- **OWASP:** A03 Injection — Stored Cross-Site Scripting
- **Location:** `POST /part/qa` → rendered raw on `GET /part?id=`
- **Exploit:** Log in, open any part, post a question containing `<script>alert(document.cookie)</script>` (or an `<img onerror>` payload). It is stored and executed for **every visitor** of that product page, including the admin.
- **Impact:** Session theft (the role cookie is not HttpOnly — see P1), admin account takeover, defacement of the store's most-visited pages.

---

## Feature: Cart & Checkout

### C1. Fitment Bypass — Incompatible Part Ordered Anyway (was #1)
- **OWASP:** A01 Broken Access Control / business-logic (missing server-side function-level check)
- **Location:** `POST /checkout` (fitment is only enforced in the `GET /checkout` page, which hides the button)
- **Exploit:** Log in as Dewan (vehicles: Corolla 2016, Golf 2017). Add the F-150-only **Vented Brake Rotor** (part 2) to the cart. The checkout page blocks you with a fitment warning. Now send the checkout POST directly (`curl -X POST /checkout -b <cookies> -d "vehicleId=1"`), or use the direct-buy parameters `partId=2&qty=1`. The order is created for a part that cannot physically fit the car.
- **Impact:** Customers receive parts that don't fit → returns, chargebacks, and a real safety hazard if an incompatible brake/suspension part is installed. The store's core promise ("fitted right") is unenforced where it matters.

### C2. Trade-Pricing Bypass — Claim Trade Prices as a Retail Customer (was #4)
- **OWASP:** A01 Broken Access Control / business-logic (client-controlled pricing tier)
- **Location:** `POST /checkout`, parameter `accountType`
- **Exploit:** As retail customer Dewan, POST checkout with `accountType=trade`. The server prices the order from the **request parameter**, not the account. Retail $59.99 brake pads become the $41.99 trade price (~30% margin theft on every line).
- **Impact:** Direct revenue loss; trade pricing is a vetted commercial privilege (garages only) and margin structure collapses if anyone can claim it.

### C3. Price Tampering at Checkout (was #7)
- **OWASP:** A04 / business-logic — client-controlled price (CWE-472 parameter tampering)
- **Location:** `POST /checkout`, per-line field `price_<partId>` (rendered as an editable input)
- **Exploit:** At checkout, edit the unit-price field (e.g. brake pads `price_1=0.01`) or add it to a direct POST. The server trusts the posted price and totals the order with it.
- **Impact:** Attackers buy parts for pennies; finance sees "valid" orders at impossible prices.

### C4. Negative Quantity Tampering *(new)*
- **OWASP:** A04 Insecure Design — business-logic (unvalidated quantity)
- **Location:** `POST /checkout`, direct-buy parameter `qty`
- **Exploit:** Direct-buy takes the quantity raw: POST `partId=3&qty=-5`. The order is created with quantity −5 and a **negative total** (−$64.95) — and the stock count quietly *increases*.
- **Impact:** Negative orders can generate credit, corrupt inventory and poison accounting/fulfilment data.

### C5. Coupon Reuse Without Limit (was #14)
- **OWASP:** Business-logic / A04 Insecure Design (no redemption accounting)
- **Location:** `POST /checkout`, parameter `coupon` (`PARTS15`, `TRADE10`, `GARAGE25`)
- **Exploit:** There is no per-user or per-code redemption record. Use `GARAGE25` (25% off) on **every** order, forever. The lab counts the flaw on the second successful use of the same code by the same account.
- **Impact:** Promotions become permanent, unlimited price cuts; a leaked code can never be "used up" or attributed.

---

## Feature: Orders

### O1. Order IDOR — Read Any Order (was #6)
- **OWASP:** A01 Broken Access Control (IDOR/BOLA)
- **Location:** `GET /order?id=`
- **Exploit:** Logged in as any customer, open `/order?id=1002` — Omar's order, with his name, vehicle, items and prices.
- **Impact:** Purchase history, vehicle ownership and spending data of every customer is exposed; feeds targeted phishing and the returns fraud in T1.

---

## Feature: Quotes

### U1. Quote IDOR — View & Accept Another Customer's Quote (was #5)
- **OWASP:** A01 Broken Access Control (IDOR/BOLA)
- **Location:** `GET /quote?id=`, `POST /quote/accept`
- **Exploit:** Log in as Dewan and open `/quote?id=501` — Sara's negotiated quote ($198 alternator). Click accept (or POST `quoteId=501`): an order is created **on your account at her negotiated price**, and her quote is consumed.
- **Impact:** Confidential negotiated pricing leaks to competitors/customers; victims lose quotes they negotiated; attackers buy at prices meant for someone else.

---

## Feature: Returns

### T1. Returns IDOR — File a Return Against Someone Else's Order (was #13)
- **OWASP:** A01 Broken Access Control (IDOR on a state-changing action)
- **Location:** `POST /returns` (`orderId` never checked against the caller)
- **Exploit:** As Dewan, POST `orderId=1002&reason=Damaged` — a return (and its refund workflow) is opened against **Omar's** order. Repeat to flood his account with returns.
- **Impact:** Fraudulent refunds, victims' orders stuck in return workflows, support/warehouse chaos; combined with O1 it needs nothing but an order number.

---

## Feature: Profile & Garage

### G1. CSRF on Vehicle & Profile Changes (was #11)
- **OWASP:** A01 / CSRF (CWE-352) — no anti-CSRF tokens on any state-changing form
- **Location:** `POST /vehicles`, `POST /settings` (also `/cart/*`, `/admin/part`)
- **Exploit:** Host a page with an auto-submitting form posting to `http://127.0.0.1:3016/settings` (change name/address/phone) or `/vehicles` (add a vehicle with an attacker's VIN). Any logged-in victim who visits it is silently modified — no token, no SameSite cookie, no Origin check. (The lab detects the proof as a state change arriving with a foreign `Origin` — exactly what a cross-site form sends — or with none of the app's own markers.)
- **Impact:** Account data manipulation, fitment/garage poisoning (victim's checkout fitment now computed against an attacker's vehicle), support-desk confusion.

---

## Feature: Admin & Platform

### P1. Role Tampering via Cookie → Admin (was #10)
- **OWASP:** A01 Broken Access Control / A07 Auth failures (trusting client-side role state)
- **Location:** `effectiveRole()` — the plain `role` cookie overrides the server-side account role; also set at login without `HttpOnly` concerns for the role value
- **Exploit:** Log in as Dewan, then change the `role` cookie from `retail` to `admin` (dev-tools → Application → Cookies). Reload `/admin` — full dashboard: all orders, all users, and price-editing power.
- **Impact:** Total compromise of the store back office: pricing sabotage, customer data, order history.

### P2. Unauthenticated Customer Data Export *(new)*
- **OWASP:** A01 Broken Access Control / A02 Cryptographic Failures (sensitive data exposure)
- **Location:** `GET /api/customers`
- **Exploit:** No login, no role, no token: the "admin tooling" export returns every customer as JSON — id, name, email, role, home address and phone.
- **Impact:** The whole customer PII set in one request — phishing lists, identity fraud, and a reportable breach from an endpoint nobody linked anywhere.

---

**Stability note:** none of these are crash bugs — malformed input returns a friendly
error page and the server keeps running, so a failed exploit attempt never ends the session.

**The key mechanism (by design, not a flaw to find):** this lab starts locked. Its
entry key is the previous lab's completion key. The completion key for the next lab
is never stored anywhere in readable form — it is split into encoded pieces scattered
across the application and assembled only when progress reaches 100%, when it is
revealed on `/complete` (and only then shared with the Lab Assistant). Do not waste
time hunting for it in the source: finish the tests.
