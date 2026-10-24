# HexaMart — Vulnerability Map (23 tests, grouped by feature)

Every flaw below is deliberate, reproducible, and rooted in a supermarket
workflow. This is the lab's complete test registry — the same 23 tests the
in-app Mission page (`/tests`) tracks. Categories follow the OWASP Top 10
(2021) naming. The lab completes each test only when the server observes
the exploit actually succeeding.

---

## Feature: Login & Authentication

### A1. SQL injection — login bypass
- **OWASP:** A03 Injection · **Difficulty:** Intermediate
- **Location:** `POST /login` (legacy string-built "query" path)
- **Exploitation:** Submit the login form with email
  `admin@hexamart.local' OR '1'='1' --` and any password. The concatenated
  query's password check is commented out by the payload and a session is
  issued for the manager account (the name before the quote selects the
  victim; no match → the first account).
- **Business impact:** Instant admin takeover with no password at all —
  every order, customer and price in the store is exposed.

### A2. Brute force — no rate limiting or lockout
- **OWASP:** A07 Identification & Authentication Failures · **Difficulty:** Beginner
- **Location:** `POST /login`
- **Exploitation:** Send 10+ wrong-password attempts for one account
  (e.g. `tanvir@example.com`). Every failure is processed identically —
  no delay, no lockout, no CAPTCHA — so thousands can be tried.
- **Business impact:** Credential stuffing and password guessing against
  real customer accounts; one weak password hands over the account.

### A3. User enumeration via differing responses
- **OWASP:** A07 Identification & Authentication Failures · **Difficulty:** Beginner
- **Location:** `POST /login`, `POST /forgot`
- **Exploitation:** A registered email with a wrong password answers
  "Incorrect password for that account."; an unknown email answers
  "No account is registered with that email." `/forgot` differs the same
  way. Probe both cases and diff the messages to harvest real accounts.
- **Business impact:** The customer list can be enumerated at scale,
  feeding targeted phishing and credential-stuffing target lists.

### A4. Predictable password-reset token
- **OWASP:** A07 Identification & Authentication Failures · **Difficulty:** Advanced
- **Location:** `POST /forgot` → tokens of the form `HM-<userId>-<1000+counter>`
- **Exploitation:** Request a reset for your own account and observe your
  token (e.g. `HM-3-1001`). The admin's userId is 1 — predict/iterate the
  counter (`HM-1-1001`, …) and POST `/reset` with the forged token to set
  a new admin password, no mailbox access needed.
- **Business impact:** Full account takeover of any account, including the
  store manager, by guessing.

---

## Feature: Registration & Profile

### P1. Mass assignment on profile update
- **OWASP:** A04 Insecure Design / A08 Integrity Failures · **Difficulty:** Intermediate
- **Location:** `POST /profile/update`
- **Exploitation:** The settings form only shows name/phone/address, but
  the handler copies **every** submitted field onto the user record.
  Intercept the request and add `loyaltyPoints=999999` (or
  `storeCredit=5000`, or `role=admin`) — it is accepted and saved.
- **Business impact:** Self-service privilege and balance escalation; the
  profile endpoint silently becomes an admin/billing endpoint.

### P2. No password policy at registration
- **OWASP:** A07 Identification & Authentication Failures · **Difficulty:** Beginner
- **Location:** `POST /register` (and anywhere a password is set)
- **Exploitation:** Register a new account with the password `a`. It is
  accepted and you are logged in — there is no length, complexity or
  breached-password check anywhere.
- **Business impact:** Weak customer passwords are guessed at scale;
  each cracked account exposes orders, addresses and loyalty value.

### P3. Stored XSS via profile name
- **OWASP:** A03 Injection (Stored XSS) · **Difficulty:** Intermediate
- **Location:** `POST /profile/update` → rendered raw in the greeting on `GET /profile`
- **Exploitation:** Set your display name to
  `<script>alert(document.cookie)</script>` and open your profile page —
  the greeting prints the stored name unescaped and the script executes.
- **Business impact:** Session theft of anyone viewing the profile,
  including staff; a foothold for actions performed as the manager.

---

## Feature: Product Search

### S1. SQL-injection-style search bypass
- **OWASP:** A03 Injection · **Difficulty:** Intermediate
- **Location:** `GET /?q=...` (search builds a naive string "query")
- **Exploitation:** Search for `' OR '1'='1` (or `x' OR 1=1 --`). The
  filter is bypassed and every product row is returned, with the
  constructed query echoed on the page. (Simulated engine — the pattern
  mirrors classic SQLi: user input is concatenated into the query
  instead of being parameterised.)
- **Business impact:** In a real deployment this class of flaw leads to
  full database extraction — customers, orders, credentials.

### S2. Reflected XSS in search
- **OWASP:** A03 Injection (Reflected XSS) · **Difficulty:** Beginner
- **Location:** `GET /?q=...` ("Showing results for:" line)
- **Exploitation:** Search for `<script>alert(1)</script>`. The results
  heading prints the term back **unescaped**, so a crafted search link
  runs script in the victim's browser.
- **Business impact:** Session theft and checkout hijacking delivered
  through the store's own trusted pages and links.

---

## Feature: Reviews

### R1. Stored XSS in product reviews
- **OWASP:** A03 Injection (Stored XSS) · **Difficulty:** Intermediate
- **Location:** `POST /product/:id/review`, rendered on `GET /product/:id`
- **Exploitation:** Post a review containing
  `<script>alert(document.cookie)</script>` (or an `<img onerror>`
  payload). Every visitor of that product page executes it.
- **Business impact:** Session theft of shoppers (including the store
  manager), defacement, and malware/phishing delivery from a trusted page.

---

## Feature: Cart

### C1. Negative-quantity cart bug
- **OWASP:** A04 Insecure Design (missing input validation) · **Difficulty:** Beginner
- **Location:** `POST /cart/add`, `POST /cart/update`
- **Exploitation:** Add an expensive item with qty `1`, then add a second
  item and set its quantity to `-50`. The cart total drops below the real
  price of the first item — checkout charges the reduced (even negative)
  total, and stock *increases* on order.
- **Business impact:** Customers check out below cost or with a credit;
  inventory counts are corrupted by negative stock movements.

---

## Feature: Checkout & Payments

### K1. Price tampering at checkout
- **OWASP:** A04 Insecure Design / A08 Integrity Failures · **Difficulty:** Beginner
- **Location:** `POST /checkout`, fields `price_<productId>`
- **Exploitation:** Add the $9.89 Soybean Oil 5L to the cart. On the
  checkout form, edit its unit-price field to `0.10` and place the order.
  The server charges the client-submitted price, not the catalogue price.
- **Business impact:** Arbitrary self-pricing of every product; the
  receipt itself records the fake price as if legitimate.

### K2. Bulk-discount tier manipulation
- **OWASP:** A04 Insecure Design (business-logic flaw) · **Difficulty:** Beginner
- **Location:** `POST /checkout`, field `bulkDiscountPercent`
- **Exploitation:** Buy a single low-value item. On the checkout page,
  change the tier dropdown (or intercept the request) to
  `bulkDiscountPercent=90`. The server applies a 90% "partner tier"
  discount to a 1-item order; the tier is never checked against the
  cart quantity.
- **Business impact:** Margin destruction at scale — anyone can buy the
  whole store at wholesale-or-below prices.

### K3. Coupon stacking + unlimited reuse
- **OWASP:** A04 Insecure Design (business-logic flaw) · **Difficulty:** Intermediate
- **Location:** `POST /checkout`, field `coupons`
- **Exploitation:** Enter `SAVE10,FRESH5,BULK20` — all three apply. Repeat
  the same code (`SAVE10,SAVE10,SAVE10`) and it applies again each time;
  reuse a code on your next order and it applies again — redemptions are
  recorded in a ledger that is never enforced.
- **Business impact:** Discount abuse compounds with K1/K2; promotions
  become an unbounded liability instead of a capped marketing cost.

### K4. Overselling — no stock check at checkout
- **OWASP:** A04 Insecure Design (business-logic flaw) · **Difficulty:** Intermediate
- **Location:** `POST /checkout` (cart quantities vs `product.stock`)
- **Exploitation:** Whole Chicken has stock 85. Put 500 in the cart and
  check out: the order is accepted in full and the stock drops below
  zero. Nothing anywhere compares quantity to availability.
- **Business impact:** The store sells groceries it does not have —
  cancelled orders, refunds, compensation, corrupted inventory data.

---

## Feature: Orders & Receipts

### O1. IDOR — any customer can read any order
- **OWASP:** A01 Broken Access Control (IDOR) · **Difficulty:** Beginner
- **Location:** `GET /orders/:id`
- **Exploitation:** Login as Rahim (his order is #2). Browse to
  `/orders/1` and `/orders/3` — Sara's orders render in full.
- **Business impact:** Every customer's purchases are visible to every
  other customer; privacy breach and phishing material.

### O2. IDOR — any customer can read any receipt (PII)
- **OWASP:** A01 Broken Access Control (IDOR) · **Difficulty:** Beginner
- **Location:** `GET /receipt/:id`
- **Exploitation:** Same pattern on `/receipt/1` and `/receipt/3` —
  Sara's receipts open in full, including her name, email, delivery
  address and purchases. Enumerate IDs 1…N.
- **Business impact:** Mass disclosure of customer PII and purchase
  history; a reportable breach and a ready-made phishing dataset.

---

## Feature: Loyalty Programme

### L1. Loyalty points redemption without balance check
- **OWASP:** A04 Insecure Design / A01 Broken Access Control · **Difficulty:** Beginner
- **Location:** `POST /loyalty/redeem` (and points redemption on `POST /checkout`)
- **Exploitation:** Login as `rahim@example.com` (balance: 240 pts). POST
  `points=1000000` to `/loyalty/redeem`. The server subtracts the points
  (balance goes to −999,760) and still credits **$10,000 store credit**.
- **Business impact:** Direct financial loss — unlimited free groceries
  paid for with invented points; loyalty liability becomes meaningless.

### L2. Loyalty transfer from ANY account (no ownership verification)
- **OWASP:** A01 Broken Access Control / A07 · **Difficulty:** Intermediate
- **Location:** `POST /loyalty/transfer`
- **Exploitation:** Login as any customer. Submit the transfer form with
  `fromEmail=sara@example.com` (1,320 pts), `toEmail=` your own email,
  `points=1300`. The server moves Sara's points to you — it never checks
  that *you* own the source account.
- **Business impact:** Theft of every customer's loyalty balance; fraud,
  support chaos, and loss of trust in the loyalty programme.

### L3. CSRF on profile and loyalty actions
- **OWASP:** A01 Broken Access Control (missing anti-CSRF tokens) · **Difficulty:** Advanced
- **Location:** state-changing forms — `POST /profile/update`,
  `/loyalty/redeem`, `/loyalty/transfer`, `/supplier/product/:id`. The
  app's own forms carry a simple `hx_origin` marker used by the lab for
  detection only; there is no real token defence, and **any** request —
  including one with no marker or a cross-site Origin — is executed.
- **Exploitation:** Host a page with an auto-submitting form pointing at
  `http://127.0.0.1:3012/loyalty/transfer`. When a logged-in victim
  visits it, their browser performs the action with their session.
- **Business impact:** Silent theft of points and profile changes
  executed under victims' identities; hard for victims to even notice.

---

## Feature: Supplier Console

### U1. Supplier can edit ANY product (broken access control)
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Location:** `GET /supplier`, `POST /supplier/product/:id`
- **Exploitation:** Login as the supplier. The inventory console lists
  all 24 products — including the 13 owned by "Supplier 9". Set a
  competitor's product price to $0.01 or its stock to 0 and save. It
  applies instantly.
- **Business impact:** A single supplier account can sabotage
  competitors' pricing or wipe their stock from the shelves.

---

## Feature: Admin Panel

### M1. Role tampering via session cookie → admin
- **OWASP:** A07 Identification & Authentication Failures / A01 · **Difficulty:** Intermediate
- **Location:** the `hm_session` cookie (`<userId>.<role>`, unsigned)
- **Exploitation:** Login as any customer. In the browser's cookie
  editor, change `hm_session` from e.g. `3.customer` to `3.admin`.
  Reload — the Admin dashboard link appears and `/admin` opens with
  full user/order data.
- **Business impact:** Complete privilege escalation by any registered
  user; the whole store's data and revenue figures are exposed.

---

## Feature: Platform & Data Exposure

### D1. Unauthenticated customer data API
- **OWASP:** A01 Broken Access Control / A05 Security Misconfiguration · **Difficulty:** Beginner
- **Location:** `GET /api/customers` (leftover "partner integration" endpoint)
- **Exploitation:** Open `/api/customers` in a private window — no login
  at all. It returns JSON for every user: names, emails, phone numbers,
  home addresses, roles, loyalty balances and store credit.
- **Business impact:** One unauthenticated request exfiltrates the
  entire customer database — a reportable breach and a phishing list.

---

### Cross-cutting notes
- Passwords are stored in plaintext in this lab (seed data) — part of
  the practice context, and another reason this app must never leave
  localhost.
- Sessions never expire — useful context when assessing M1 and A4 in a
  real report.
- Detection: the lab marks a test complete only on observed success
  (e.g. L1 fires when a redemption exceeds the real balance; K3 fires on
  stacking, repetition, or cross-order reuse). Attempts per feature are
  counted on every relevant request — the assistant's help lock uses
  them, and they persist in `progress.json`.
