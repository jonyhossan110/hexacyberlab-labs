# HexaGrocery — Intentional Vulnerabilities (22 tests, 10 features)

Every flaw below is deliberate, rooted in the grocery-delivery workflow, and reproduces against the seeded app. Each one is also a **test**: the lab ticks it automatically when the server observes the exploit succeeding. Accounts: `monir@hexagrocery.local` / `ela@hexagrocery.local` (`User@123`), `picker@hexagrocery.local` (`Picker@123`), `admin@hexagrocery.local` (`Admin@123`).

---

## Feature: Login & Authentication

### A1. SQL injection — login bypass *(new)*
- **OWASP:** A03 Injection (CWE-89 pattern, simulated string-built query)
- **Location:** `POST /login` — the legacy login path evaluates credentials through a naively-built query (`WHERE email='<e>' AND password='<p>'`); quote logic in the input is interpreted instead of parameterised.
- **Exploit:** Email `' OR '1'='1' -- ` with any password → the condition becomes always-true, the password check is commented out, and the first row (the admin) is logged in.
- **Business impact:** Full account takeover including admin, with no credentials at all.

### A2. Brute force — no login rate limiting *(new)*
- **OWASP:** A07 Identification & Authentication Failures (CWE-307)
- **Location:** `POST /login` — failures are processed forever; no throttle, lockout, CAPTCHA or delay.
- **Exploit:** Script 10+ wrong passwords for `ela@hexagrocery.local` — every attempt is answered normally; a wordlist would simply keep going.
- **Business impact:** Password guessing is free and silent; one weak password becomes a takeover.

### A3. User enumeration via error messages *(new)*
- **OWASP:** A07 Identification & Authentication Failures (CWE-204)
- **Location:** `POST /login` and `POST /forgot` — "No account found for that email" vs "Incorrect password for that account" (and the equivalent pair on the reset form).
- **Exploit:** Probe both endpoints with a real email and an invented one; the different answers confirm which accounts exist.
- **Business impact:** Attackers harvest a verified target list from the site itself, then aim phishing and password attacks only at real accounts.

### A4. Weak / predictable password-reset token *(was #11)*
- **OWASP:** A07 Identification & Authentication Failures (CWE-337 predictable seed / CWE-338 weak PRNG)
- **Location:** `POST /forgot` — token format is `rst-<userId>-<yyyymmddhhmm>` (user id + current minute). The tokens are never emailed anywhere, so possession of a working token is proof of prediction.
- **Exploit:** Request a reset for the admin, guess `rst-1-<this minute>` (a handful of attempts covers clock skew), POST `/reset` with a new password → account takeover.
- **Business impact:** Full account takeover of any account, including admin, with no inbox access.

## Feature: Session & Access Control

### S1. Role tampering via cookie → admin *(was #8)*
- **OWASP:** A01/A07 — broken access control / identification failures (CWE-565 reliance on cookies without integrity check)
- **Location:** `roleOf()` trusts the unsigned `role` cookie set at login; `/admin` and `/picker` authorise from it.
- **Exploit:** Log in as any customer, edit the cookie to `role=admin`, open `/admin` → full dashboard (orders, users, wallets, raw notes). `role=picker` opens the Picker Desk the same way.
- **Business impact:** Complete privilege escalation with zero credentials; every "admin-only" control behind it falls.

## Feature: Registration & Profile

### R1. Weak password policy at registration *(new)*
- **OWASP:** A07 Identification & Authentication Failures (CWE-521)
- **Location:** `POST /register` — any password is accepted, including a single character.
- **Exploit:** Register with password `a` → the account is created without complaint.
- **Business impact:** Customers will choose terrible passwords; credential stuffing owns those accounts first.

### R2. Mass assignment on profile update — walletBalance *(was #12)*
- **OWASP:** A03/A08 — mass assignment (CWE-915 improperly controlled modification of dynamically-determined object attributes)
- **Location:** `POST /profile/update` — the submitted fields are assigned onto the user record; extra fields are honoured.
- **Exploit:** `curl -b cookies.txt -d "name=Monir&walletBalance=100000" http://127.0.0.1:3014/profile/update` → profile shows a $100,000 wallet. (`role` is assignable the same way.)
- **Business impact:** Free money in the wallet system and a second, quieter privilege-escalation path.

### R3. Stored XSS in display name *(new)*
- **OWASP:** A03 Injection — Stored XSS (CWE-79)
- **Location:** the profile greeting (`GET /profile`) renders the display name **unescaped**; the name is stored in the user record.
- **Exploit:** Set your name to `<script>alert(document.domain)</script>` via profile update → the payload executes on every view of the profile.
- **Business impact:** Script execution in other users' sessions wherever the name is displayed — session theft and defacement under the store's own domain.

### R4. CSRF on address & profile change *(was #10)*
- **OWASP:** A01 — Cross-Site Request Forgery (CWE-352)
- **Location:** `POST /addresses`, `POST /addresses/:id/edit`, `POST /profile/update` — no anti-CSRF token, no SameSite cookie attribute.
- **Exploit:** A malicious page auto-submits a form to `http://127.0.0.1:3014/profile/update` while a victim is logged in (equivalently: a state-changing POST with a foreign `Origin`) → their profile (and, via R2, wallet) changes silently.
- **Business impact:** Silent account manipulation; pairs with R2/AD1 for delivery redirection and wallet theft.

## Feature: Search & Catalogue

### SE1. SQL-injection-style search bypass *(was #14)*
- **OWASP:** A03 Injection (CWE-89 pattern, simulated string-built query)
- **Location:** `GET /search?q=` — the term is concatenated into a naive `WHERE name LIKE '%<q>%'` evaluation; quote logic is interpreted instead of parameterised.
- **Exploit:** `/search?q=' OR '1'='1` returns the entire catalogue (including stock levels) instead of matches — the classic catalogue dump pattern, reproduced in the lab's query layer.
- **Business impact:** Full catalogue + stock enumeration; in a real stack this pattern is the door to data extraction and auth bypass.

### SE2. Reflected XSS in search results *(new)*
- **OWASP:** A03 Injection — Reflected XSS (CWE-79)
- **Location:** `GET /search` — the "Results for …" heading echoes the term **unescaped**.
- **Exploit:** `/search?q=<script>alert(1)</script>` → the payload comes back as code and executes — deliverable to any victim as a link.
- **Business impact:** Session theft and phishing under the store's own brand via crafted search links.

## Feature: Cart & Checkout

### C1. Price tampering at checkout *(was #4)*
- **OWASP:** A01/A04 — client-side price trust (CWE-472 external control of assumed-immutable data)
- **Location:** `GET /checkout` renders editable `price_<productId>` inputs; `POST /checkout` bills those values.
- **Exploit:** Set `price_8=0.01` for the salmon → a $12.50 item bills at one cent.
- **Business impact:** Arbitrary basket repricing; classic e-commerce loss scenario in a grocery skin.

### C2. Negative delivery-fee tampering *(was #3)*
- **OWASP:** A03/A04 — improper input validation / business logic (CWE-20)
- **Location:** `POST /checkout` — `deliveryFee` is read from the request body and added to the total without a lower bound.
- **Exploit:** Checkout with `deliveryFee=-50` → the "fee" becomes a $50 discount against the basket.
- **Business impact:** Revenue leakage on every order; combined with C1 a basket can be checked out for $0 or less.

### C3. Coupon stacking + unlimited reuse *(was #9)*
- **OWASP:** A04 Insecure Design — business logic (CWE-837)
- **Location:** `POST /checkout` — the `coupon` field accepts a comma list, applies each percentage in sequence, and never records redemption per user.
- **Exploit:** `coupon=FRESH10,GROCERY20,WELCOME15,FRESH10,GROCERY20` → discounts compound without limit, and the same codes work again on the next order.
- **Business impact:** Promotion budget drained; combined with C1/C2 produces negative totals.

### C4. Quantity tampering — negative quantities *(new)*
- **OWASP:** A04 Insecure Design — improper input validation (CWE-20)
- **Location:** `POST /cart/add` — the quantity is stored exactly as sent; negative or absurd values are never validated.
- **Exploit:** Add Whole Milk with `qty=-5` → the cart subtotal drops by $13.00, and checkout bills the negative line.
- **Business impact:** A discount of any size, chosen by the customer, on any basket — stacks with every other checkout flaw.

## Feature: Delivery Slots

### D1. Delivery-slot capacity bypass *(was #1)*
- **OWASP:** A01 Broken Access Control / business-logic (CWE-862 missing authorization check on the server path)
- **Location:** `POST /checkout` — slot capacity was only "enforced" by disabling the option in the checkout form (`GET /checkout`, `GET /slots`); the FULL slot (id 3, 10:00–11:00, 2/2) is reachable by posting its `slotId` directly.
- **Exploit:** Add any item to the cart, then post the FULL slot's id directly (the browser form will never offer it):
  `curl -b cookies.txt -d "slotId=3&addressId=1&deliveryFee=2.99&price_4=2.60&note=x" http://127.0.0.1:3014/checkout`
  → 302 to a created order; slot 3 now reads 3/2 booked. The server computes `slotFull` and then ignores it — enforcement exists only in the disabled `<option>`.
- **Business impact:** Oversold delivery windows, missed delivery promises, picker/driver overload, refunds and churn on the most popular hour.

### D2. Slot-reservation race (check-then-act overbooking) *(was #13)*
- **OWASP:** A04 Insecure Design (CWE-362 race condition / CWE-366)
- **Location:** `POST /checkout` — capacity is evaluated, then an async step (~120 ms simulated payment/packing) runs, then `slot.booked` is incremented **with no lock and no atomic compare-and-set**; the reservation is check-then-act end to end.
- **Exploit (parallel curl):** Prepare several sessions (or accounts), each with an item in the cart, then fire their checkouts for slot 4 (0/3) at once. All of them observe "room available" before any commit lands; the slot ends booked well past capacity (verified: 6/3).
- **Business impact:** The flagship grocery failure: more orders than drivers for the hour — late deliveries, cold-chain breakage, refunds.

> Note for trainers: D1 and D2 are a pair. D1 = "capacity lives in the UI; the server check is advisory and ignored". D2 = the same commit path is also a check-then-act race, so parallel checkouts overbook even a slot that still has room.

## Feature: Orders

### O1. IDOR — view/track another customer's order (with address + phone) *(was #5)*
- **OWASP:** A01 Broken Access Control (CWE-639 IDOR)
- **Location:** `GET /orders/:id` — no ownership check; the page includes the delivery address and phone number.
- **Exploit:** Log in as Ela, open `/orders/<Monir's order id>` → full order, live status, address, phone.
- **Business impact:** Customer PII exposure at scale (order ids are sequential from 1001), stalking/doxxing risk, GDPR-style liability.

### O2. Stored XSS in the delivery note *(was #7)*
- **OWASP:** A03 Injection — Stored XSS (CWE-79)
- **Location:** Order `note` is rendered unescaped on `GET /orders/:id`, `GET /picker` and `GET /admin`.
- **Exploit:** Checkout with note `<script>alert(document.cookie)</script>` (or a session-riding payload) → fires in the browser of every driver/admin who opens the order.
- **Business impact:** Staff session theft → admin compromise; the note is the one field every employee must read.

## Feature: Address Book

### AD1. IDOR — edit another customer's saved address *(was #6)*
- **OWASP:** A01 Broken Access Control (CWE-639)
- **Location:** `GET/POST /addresses/:id/edit` — no ownership check.
- **Exploit:** As Ela, POST to `/addresses/1/edit` (Monir's address) changing the line/phone → Monir's next delivery goes to the attacker's address.
- **Business impact:** Delivery theft/redirection, account-takeover stepping stone, support fraud.

## Feature: Picker & Substitutions

### P1. Substitution price-difference flaw *(was #2)*
- **OWASP:** A04 Insecure Design / business-logic (CWE-837 improper enforcement of pricing rules)
- **Location:** `POST /picker/orders/:id/substitute` — the amount charged for a substitute is taken from the request field `price` instead of the substitute product's real price.
- **Exploit:** As picker, on any order propose substitute id 8 (Atlantic Salmon, $12.50) with `price` set to the original item's price (e.g. 2.60). The order is billed your price for a $12.50 item; the "price difference" the customer should pay never materialises.
- **Business impact:** Direct margin loss on every substitution — the exact flow designed for out-of-stock recovery becomes a discount channel for premium goods.

## Feature: Platform & Data Exposure

### PL1. Sensitive data exposure via `/api/users` *(new)*
- **OWASP:** A01 Broken Access Control / A05 Security Misconfiguration (CWE-200)
- **Location:** `GET /api/users` — an unauthenticated JSON endpoint returning every account: id, email, name, role, wallet balance **and password**.
- **Exploit:** `curl http://127.0.0.1:3014/api/users` with no session at all → the full user table.
- **Business impact:** One request hands over the entire customer list with credentials — instant account takeovers and a reportable data breach.
