# HexaBookStore (LAB 9) — Intentional Vulnerabilities: The Complete Map

All **26 tests** are live and reproducible against the seed data, grouped
below by the feature they belong to. Each entry: name, test id, OWASP
category, where it lives, how to exploit it, and the business impact if
this were a real bookstore. In the running lab, a test is scored
**complete only when the server observes the exploit succeed** — see
`/tests` in the app for status, hints and attempt counts.

The first build of HexaBookStore shipped 14 of these flaws; the LAB 9
rebuild added the remaining 12 (marked **NEW**) so that every feature
carries every technique that applies to it.

---

## Feature: Login & Authentication

### A1. SQL Injection Login Bypass — `auth-sqli-login` (NEW)
- **OWASP:** A03:2021 Injection
- **Location:** `POST /login` (legacy concatenated-query path)
- **Flaw:** Alongside the normal check, login honours a "legacy" lookup
  built by string concatenation. A comment sequence in the email cuts the
  password condition out of the query; a tautology rewrites it.
- **Exploit:** Email `admin@hexabookstore.local'--`, any password → you
  are logged in as admin. `' OR '1'='1` in a field works too.
- **Impact:** Instant administrative takeover with no password. Everything
  behind the login is exposed in one request.

### A2. Brute Force — No Rate Limiting or Lockout — `auth-brute-force` (NEW)
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Location:** `POST /login`
- **Flaw:** Failed logins are never throttled: no delay, no CAPTCHA, no
  lockout. The 10th failure is processed exactly like the 1st.
- **Exploit:** Script 10+ wrong passwords for one account — nothing slows
  or stops you. Keep going until a weak password falls.
- **Impact:** Credential stuffing and brute force at full speed against
  every customer account.

### A3. Account Enumeration via Password Reset — `auth-enumeration` (NEW)
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Location:** `POST /forgot`
- **Flaw:** The response differs observably: a registered email is shown
  its reset link; an unregistered one gets a vague generic message.
- **Exploit:** Probe candidate emails — the response tells you exactly
  which ones have accounts.
- **Impact:** A verified target list for phishing and password attacks,
  harvested from the store's own form.

### A4. Default & Documented Demo Credentials — `auth-default-creds` (NEW)
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Location:** seed accounts (documented on the login page itself)
- **Flaw:** The shipped accounts accept their printed passwords:
  admin / `Admin@123`, every customer / `User@123`.
- **Exploit:** Log in with the documented admin credentials.
- **Impact:** If demo/default accounts survive into production, the store
  is one documentation page away from full compromise.

### A5. Predictable Password-Reset Token — `auth-reset-token`
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Location:** `POST /forgot`, `GET/POST /reset?token=…`
- **Flaw:** Reset tokens are `reset-<userId>-<dayOfMonth>` — e.g. the
  admin is user 1, so today's admin token is literally `reset-1-<today's
  date>`. Tokens never expire.
- **Exploit:** Browse to `/reset?token=reset-1-<day>` and set a new admin
  password — computed, never requested, never emailed. User ids are
  visible across the site (library URLs, order pages).
- **Impact:** Full account takeover of any account, including admin, with
  zero interaction with the victim. The "secret" is printed on the site.

### A6. Role Tampering via Unsigned Session Cookie — `auth-cookie-role`
- **OWASP:** A02:2021 Cryptographic Failures / A07:2021 Auth Failures
- **Location:** the `hbs_session` cookie (base64 JSON, no signature)
- **Flaw:** The session cookie is an unsigned base64 blob like
  `{"uid":2,"role":"customer"}` — and the server trusts the `role` inside
  it for the admin gate.
- **Exploit:** Decode your cookie, change `"role"` to `"admin"`,
  re-encode, and open `/admin`. Full dashboard: every customer, every
  order, revenue.
- **Impact:** Total administrative compromise by any registered user —
  the difference between a shopper and the store owner is one base64 edit.

---

## Feature: Registration & Profile

### P1. Mass Assignment — Role Taken From the Form — `profile-mass-assignment` (NEW)
- **OWASP:** A01:2021 Broken Access Control (Mass Assignment)
- **Location:** `POST /register`, `POST /profile`
- **Flaw:** Request fields are bound straight onto the user record —
  including `role`, which no visible form ever shows.
- **Exploit:** Add `role=admin` to a registration (or profile save)
  request. Your account is created (or promoted) as administrator.
- **Impact:** Attackers self-register as admins, bypassing every business
  rule around sign-up and roles.

### P2. Stored XSS via Profile Display Name — `profile-name-xss` (NEW)
- **OWASP:** A03:2021 Injection (Stored XSS)
- **Location:** profile `name` → review byline on book pages
- **Flaw:** The display name is printed **unescaped** as the author
  byline of your reviews.
- **Exploit:** Set your name to `<script>alert('name')</script>`, then
  post any review. The payload is stored in the byline and fires for
  every visitor of that book page.
- **Impact:** One "harmless" field weaponised against customers and
  admins: session theft, fake announcements, defacement.

### P3. Weak Password Policy — `profile-weak-password` (NEW)
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Location:** `POST /register`, `POST /reset`
- **Flaw:** No length or complexity check exists anywhere. A
  one-character password is accepted.
- **Exploit:** Register with the password `x`. The account is created.
- **Impact:** Trivial passwords are brute-forced in seconds — and combined
  with A2 (no throttling) those accounts fall first.

### P4. CSRF on Profile and Gift Actions — `profile-csrf`
- **OWASP:** A01:2021 Broken Access Control (CSRF)
- **Location:** `POST /profile`, `POST /gift`, `POST /cart/coupon`, …
- **Flaw:** No anti-CSRF token exists anywhere in the app, and
  state-changing forms accept cross-site posts while the victim is
  logged in.
- **Exploit:** Host a page with an auto-submitting form targeting
  `http://127.0.0.1:3017/profile` that changes the victim's email — or one
  targeting `/gift` that sends their books to the attacker's account.
  (In the lab, simulate it with a cross-origin POST: an `Origin` header
  from another site plus the victim's session cookie.)
- **Impact:** Account-detail takeover paths (email change → password
  reset) and theft of digital goods, executed with the victim's own
  session by simply getting them to open a page.

---

## Feature: Search, Catalogue & Reviews

### S1. SQL-Injection-Style Search Bypass — `search-sqli`
- **OWASP:** A03:2021 Injection
- **Location:** `GET /search?q=…`
- **Flaw:** The search "query" is assembled by string concatenation
  (`... WHERE title LIKE '%<input>%'`) and evaluated naively, so a quote
  in the input breaks out of the pattern and rewrites the logic.
- **Exploit:** Search for `' OR '1'='1`. The catalogue filter collapses
  and the results include the hidden internal listing **"STAFF ONLY —
  Winter Pricing Strategy 2027"** (book 16), which no normal search or
  page ever shows.
- **Impact:** Confidential internal documents (here: next year's pricing
  strategy) leak through the shop's most public input. In a real stack
  this same pattern is how customer tables get dumped.

### S2. Reflected XSS in Search — `search-reflected-xss` (NEW)
- **OWASP:** A03:2021 Injection (Reflected XSS)
- **Location:** `GET /search?q=…` ("You searched for:" line)
- **Flaw:** The search term is echoed back into the results page
  **without output encoding**.
- **Exploit:** Search for `<script>alert(1)</script>` — it executes
  immediately. Send the crafted link to a victim and it executes for
  them, on the store's origin.
- **Impact:** Session theft and page redressing (phishing clones) served
  from the real storefront via a single link.

### S3. Stored XSS in Book Reviews — `reviews-stored-xss`
- **OWASP:** A03:2021 Injection (Stored XSS)
- **Location:** `POST /book/<id>/review`, rendered on the book page
- **Flaw:** Review text is stored and rendered **without output
  encoding**.
- **Exploit:** Post a review containing `<script>alert('xss')</script>` —
  it executes in every visitor's browser on that book page. (Try it on
  book 3, then open the page fresh, logged out.)
- **Impact:** Session theft, fake "store announcement" phishing, and
  defacement on the highest-traffic pages of the shop — the product
  pages.

---

## Feature: Cart & Coupons

### C1. Coupon Stacking + Unlimited Reuse — `cart-coupon-stack`
- **OWASP:** A04:2021 Insecure Design / business-logic flaw
- **Location:** `POST /cart/coupon`
- **Flaw:** Every submitted coupon is *added* to the cart — the same code
  can be applied repeatedly, codes are never marked used, and discounts
  stack until the total hits $0.
- **Exploit:** Apply `WELCOME10` twice and `STACK20` once → 40% off.
  Keep going (or reuse the codes on your next order) — nothing stops you.
- **Impact:** Promotions become a self-service "free checkout" button.
  Marketing budget burns with no per-user or per-code control.

### C2. Quantity Tampering — `cart-qty-tamper` (NEW)
- **OWASP:** A04:2021 Insecure Design / business-logic flaw
- **Location:** `POST /cart/setqty`
- **Flaw:** Cart quantities are set from the client with **no range
  validation** — zero, negative and absurd quantities are stored and
  obeyed by cart totals and checkout.
- **Exploit:** Set a line's quantity to `-2` (or `100000`). The cart
  total is computed from your impossible quantity.
- **Impact:** Negative quantities pull order totals down toward free;
  absurd quantities corrupt stock and flood fulfilment/delivery.

---

## Feature: Checkout & Orders

### K1. Price Tampering at Checkout — `checkout-price-tamper`
- **OWASP:** A04:2021 Insecure Design / business-logic flaw
- **Location:** `POST /checkout` — the `price_<itemId>` form fields
- **Flaw:** Line prices are posted from the browser and used to build the
  order total. The server never re-reads the catalogue price.
- **Exploit:** At checkout, change `price_1` from `12.99` to `0.50`. The
  order total is $0.50 and the book is granted in full.
- **Impact:** Checkout totals are whatever the buyer says they are —
  complete loss of pricing integrity on every order.

### K2. Edition-Upgrade Flaw — `checkout-edition-upgrade`
- **OWASP:** A04:2021 Insecure Design / business-logic flaw
- **Location:** `POST /checkout` — the `grantEdition_<itemId>` form field
- **Flaw:** The cart page renders a hidden `grantEdition_` field per
  item. The server prices the cart edition but grants whatever edition
  the request *posts back*.
- **Exploit:** Add *Salt & Cinder* **Paperback** ($12.99) to the cart. At
  checkout, intercept the request and change `grantEdition_1` to
  `Collector`. You pay $12.99; *Collector* ($49.99) lands in your library.
- **Impact:** Every Collector/Hardcover sale can be downgraded to the
  cheapest price while the warehouse ships (and the library grants) the
  premium edition — margin destruction on the highest-value SKUs.

### K3. Order IDOR — `orders-idor`
- **OWASP:** A01:2021 Broken Access Control (IDOR)
- **Location:** `GET /orders/<id>`
- **Flaw:** Order detail checks only that *someone* is logged in, not
  that the order belongs to them. Order ids are sequential.
- **Exploit:** As Priya, open `/orders/1002` — Omar's order, with his
  name, email, items and prices. Walk the id range to harvest every order.
- **Impact:** Full disclosure of customer purchase history and email
  addresses — privacy breach, phishing material, and competitive intel.

---

## Feature: Preorders

### R1. Preorder Price-Lock Bypass — `preorder-price-bypass`
- **OWASP:** A04:2021 Insecure Design / business-logic flaw
- **Location:** `POST /preorder/<bookId>` — the `price` field
- **Flaw:** The "locked" preorder price travels to the server in a hidden
  form field and is trusted blindly.
- **Exploit:** On *The Hollow Crown Protocol*, submit the preorder with
  `price=0.01` instead of `19.99`. The preorder is recorded at $0.01.
- **Impact:** The whole point of a preorder campaign — guaranteed launch
  revenue at a locked price — collapses. Attackers can lock in the entire
  print run for pennies before release day.

---

## Feature: Library, Ebooks & Gifts

### L1. Ebook Download Without Purchase — `library-ebook-read`
- **OWASP:** A01:2021 Broken Access Control (IDOR on Digital Goods)
- **Location:** `GET /read/<bookId>` (and `?download=1`)
- **Flaw:** The reader endpoint serves the full text of any book that has
  an Ebook edition. It never checks that the requester bought the book —
  it doesn't even require a login.
- **Exploit:** As anyone (or nobody), open `/read/2`. You receive the full
  text of *Salt & Cinder*, a book you never paid for. Enumerate ids 1–15.
- **Impact:** The entire digital catalogue can be mirrored for free in
  minutes. For a bookstore, the ebook file *is* the product — this is
  direct, total revenue loss on digital sales, plus piracy redistribution.

### L2. Library IDOR — `library-idor`
- **OWASP:** A01:2021 Broken Access Control (IDOR)
- **Location:** `GET /user/<id>/library`
- **Flaw:** Any logged-in user can browse any other customer's library;
  the page even links to other readers' libraries.
- **Exploit:** As Omar, open `/user/2/library` — Priya's complete library.
- **Impact:** Reading habits are sensitive personal data. Exposed
  libraries also give attackers the perfect target list for flaws L1
  and L3.

### L3. Gift-Transfer Flaw — `library-gift-flaw`
- **OWASP:** A01:2021 Broken Access Control
- **Location:** `POST /gift` — the `fromUser` field
- **Flaw:** The gift endpoint takes the *source library* from a hidden
  client field (`fromUser`). It never checks that the caller owns that
  library — or even that the book is in it. The source is never debited.
- **Exploit:** Logged in as Priya, POST `/gift` with `fromUser=3`
  (Omar), `bookId=7`, `edition=Ebook`, `toEmail=lena@hexabookstore.local`.
  Lena now owns *The Silent Compiler*, taken "from" Omar's library —
  Omar keeps his copy too, so the book has been duplicated for free.
- **Impact:** Infinite duplication of digital goods. One purchased copy
  can seed unlimited "gifts"; combined with flaws L1/L2 it turns the
  gifting feature into a piracy faucet.

---

## Feature: Files & Downloads

### F1. Unrestricted Avatar Upload (Stored HTML) — `files-avatar-upload`
- **OWASP:** A03:2021 Injection / unrestricted file upload
- **Location:** `POST /profile/avatar`, served from `GET /avatar/<userId>`
- **Flaw:** Any file type is accepted, stored, and served back with a
  content type derived from its extension — an `.html` upload is served
  as `text/html` from the store's own origin.
- **Exploit:** Upload `evil.html` containing a script. It is now hosted
  at `/avatar/<your-id>` and executes for anyone who opens it — on the
  store's domain, under the store's trust.
- **Impact:** Stored XSS by upload, phishing pages hosted on the real
  storefront domain, and a foothold for malware distribution.

### F2. Path Traversal in Sample-Chapter Download — `files-traversal` (NEW)
- **OWASP:** A01:2021 Broken Access Control (Path Traversal)
- **Location:** `GET /sample?file=<name>` (serves the `samples/` folder)
- **Flaw:** The requested file name is joined into a filesystem path
  with no sanitisation, so `../` climbs out of the samples folder.
- **Exploit:** Open `/sample?file=../server.js` — the application's own
  source code is returned. `/sample?file=../progress.json` works too.
- **Impact:** Source code, configuration and data files leak —
  credentials, keys and the roadmap to every other attack.

---

## Feature: Admin Panel

### M1. Broken Access Control on Admin Data Export — `admin-data-export` (NEW)
- **OWASP:** A01:2021 Broken Access Control / A02:2021 Sensitive Data Exposure
- **Location:** `GET /admin/export`
- **Flaw:** The support export checks only that *someone* is logged in —
  never that they are staff — and dumps every user **including
  passwords**, plus all orders and libraries, as JSON.
- **Exploit:** Log in as any ordinary customer and open `/admin/export`.
- **Impact:** One request breaches the entire customer list with
  credentials — a reportable data breach and the end of customer trust.

---

## Feature: Platform & Hardening

### H1. Missing Security Headers — `platform-headers` (NEW)
- **OWASP:** A05:2021 Security Misconfiguration
- **Location:** every response
- **Flaw:** No `Content-Security-Policy`, no `X-Frame-Options` /
  `frame-ancestors`, no `X-Content-Type-Options` on any response.
- **Exploit:** `curl -I http://127.0.0.1:3017/` and read what's missing;
  frame the store from any site (clickjacking).
- **Impact:** Clickjacking against customers and staff, and every XSS
  flaw in the app lands with no browser-level mitigation in the way.
