# HexaElectro — Intentional Vulnerabilities

27 deliberate flaws (the lab's full test registry), each rooted in this shop's own
workflows (serial numbers, warranty, trade-in, flash sales) and in the standard
weaknesses of every feature the shop has. All are live in the running app, and each
one is a scored test on the Missions page (`/tests`): the server detects the real
exploit and awards progress. Entries 1–14 are the original set; 15–27 complete the
per-feature coverage. Line references are to `server.js` (single-file build).

---

## 1. Price Tampering at Checkout
- **OWASP:** A04 Insecure Design / Business Logic — CWE-472 (External Control of Critical State Data)
- **Location:** Cart page hidden fields `price_<id>`; `checkout()` trusts `b['price_' + p.id]`.
- **Exploit:** Add a $199 SoundMax to the cart → open DevTools/Burp → change the
  `price_8` field to `1` → place order. Verified: order total **$0.90** (with coupon).
- **Impact:** Buy any product for any price; direct revenue loss on every order.

## 2. Trade-In Value Tampering
- **OWASP:** Business Logic / CWE-472
- **Location:** `POST /tradein` — the `value` field is stored verbatim as checkout credit
  (client-side JS merely *suggests* a value per grade).
- **Exploit:** `curl -b <jar> -X POST /tradein -d "device=OldPhone&grade=D&value=5000"` →
  buy a $59 charger → **total $0.00, $5,000 credit recorded**. Verified.
- **Impact:** Unlimited store credit; combined with #1, full catalogue theft.

## 3. Warranty Claim IDOR (write + read)
- **OWASP:** A01 Broken Access Control — CWE-639 (IDOR)
- **Location:** `POST /warranty/claim` never checks serial ownership; `GET /warranty/claim/:id`
  never checks claim ownership.
- **Exploit:** As Tanvir, file a claim on **Nadia's** serial `HE100001` (accepted), and open
  her seeded claim `/warranty/claim/CLM-1001` — her name + email are shown. Verified.
- **Impact:** Fraudulent claims on other customers' devices; disclosure of claim contents and PII.

## 4. Serial-Number Enumeration via Warranty Lookup
- **OWASP:** A01 Broken Access Control / A09 — CWE-359 (Exposure of Personal Data), CWE-330 (predictable identifiers)
- **Location:** `GET /warranty/lookup?serial=` — **no authentication**, returns product,
  owner name, owner email, purchase + warranty dates. Serials are sequential (`HE100001`, `HE100002`, …).
- **Exploit:** `curl "http://127.0.0.1:3011/warranty/lookup?serial=HE100002"` →
  leaks Tanvir's VoltBook + email. Iterate the number to harvest every customer. Verified.
- **Impact:** Mass PII + asset inventory disclosure; feeds #3 (fraudulent claims) and phishing.

## 5. Warranty End-Date Extension (Parameter Tampering)
- **OWASP:** Business Logic — CWE-472
- **Location:** `POST /warranty/register` — hidden field `warranty_months` is trusted.
- **Exploit:** Register serial `HE100010` with `warranty_months=1200` →
  warranty end becomes **2126-10-23** (100 years). Verified.
- **Impact:** Free lifetime warranty; unbounded support/repair liability.

## 6. Role Tampering via Cookie → Admin
- **OWASP:** A01 Broken Access Control — CWE-565 (Reliance on Cookies without Integrity Checking)
- **Location:** `isAdmin()` trusts the unsigned `role` cookie set at login.
- **Exploit:** Log in as any customer → set cookie `role=admin` (DevTools) → `GET /admin` returns **200**
  (real customer role gets 403). Verified.
- **Impact:** Full admin dashboard: products, all orders, all support tickets.

## 7. Stored XSS in Support Tickets
- **OWASP:** A03 Injection — CWE-79 (Stored XSS)
- **Location:** `ticketPage()` renders `t.subject` / `t.body` **unescaped** (list + admin views link here).
- **Exploit:** Create a ticket with body `<script>alert(1)</script>` → payload stored and served raw;
  fires for any viewer, including admins in `/admin/tickets`. Verified (payload served unescaped).
- **Impact:** Session theft / actions as support staff or admins; stored, persistent reach.

## 8. Broken Access Control — Admin Pages Open to Any Customer
- **OWASP:** A01 Broken Access Control — CWE-862 (Missing Authorization)
- **Location:** `/admin/inventory` and `/admin/claims` check only "logged in", never the role
  (unlike `/admin`, which at least checks the cookie — see #6).
- **Exploit:** As Nadia (customer): `GET /admin/inventory` → **200**; `GET /admin/claims` → **200**
  with every customer's claims and emails. Verified.
- **Impact:** Stock/value intelligence for competitors; mass claim/PII exposure without any tampering at all.

## 9. Excess Data Exposure — Customer Export API
- **OWASP:** A03 / API3 Excess Data Exposure — CWE-200
- **Location:** `GET /api/customers/export` — no authentication, returns **all** customers'
  names, emails and device serials as JSON.
- **Exploit:** `curl http://127.0.0.1:3011/api/customers/export` (no cookies). Verified.
- **Impact:** One-request full customer-list breach; combines with #4 for complete device histories.

## 10. Coupon Reuse Without Limit
- **OWASP:** Business Logic — CWE-837 (Improper Enforcement of a Single, Unique Action)
- **Location:** `checkout()` applies `ELECTRO10`/`WELCOME15` on every order; no usage record exists.
- **Exploit:** Use `ELECTRO10` on order after order — verified: 2nd order $100 → **$90.00** again.
- **Impact:** Permanent discount abuse; margin erosion at scale, trivially automated.

## 11. CSRF on Profile Change
- **OWASP:** A01 / CWE-352 (Cross-Site Request Forgery)
- **Location:** `POST /profile` — no CSRF token, no Origin/Referer check; session cookie has no SameSite.
- **Exploit:** Verified with a cross-site style POST (`Origin: https://evil.example`) — the victim's
  name was changed to "Pwned Name". A malicious page auto-submitting the form does the same in-browser.
- **Impact:** Account profile/email hijack (change email → use password reset → full takeover).

## 12. Weak / Predictable Password-Reset Token
- **OWASP:** A07 Identification & Authentication Failures — CWE-337 (Predictable Seed in PRNG) / CWE-640
- **Location:** Reset tokens are literally `reset-<userId>` with sequential user ids (`reset-1` = admin).
- **Exploit:** Browse to `/reset?token=reset-1` → set a new password for the **admin** account. Verified (form loads; token pattern shown by the Forgot flow itself).
- **Impact:** Full account takeover of every account, including admin, with zero interaction.

## 13. Unrestricted Invoice Upload → Stored HTML Hosting
- **OWASP:** A03 / CWE-434 (Unrestricted File Upload) + CWE-79
- **Location:** `POST /invoices/upload` stores arbitrary content; `GET /invoice/:id` serves it back
  as `Content-Type: text/html` to anyone, no ownership check.
- **Exploit:** Upload `<h1>FAKE INVOICE</h1><script>alert(2)</script>` → open `/invoice/2` —
  served as HTML. Verified.
- **Impact:** Phishing pages / malware lures hosted on the shop's own (trusted lab) origin; stored XSS.

## 14. Flash-Sale Race Condition (Overselling)
- **OWASP:** Business Logic — CWE-362 (Race Condition) / CWE-837
- **Location:** `checkout()` validates stock, then `await sleep(500)` ("payment processing")
  for flash items, **then** decrements — check-then-act with no lock or transaction.
- **Exploit:** Two accounts, each with 2× HexaBuds Pro (flash stock = 2) in cart, check out
  simultaneously → **both orders succeed; stock ends at −2** (4 units sold of 2). Verified.
  Reproduce: two cookie jars + parallel `curl -X POST /checkout` (see PRACTICE-GUIDE).
- **Impact:** Oversold limited stock → cancellations, refunds, reputational damage; same pattern
  applies to coupon/stock-sensitive promotions.

## 15. SQL Injection Login Bypass
- **OWASP:** A03 Injection — CWE-89 (SQL Injection)
- **Location:** `POST /login` — alongside the normal check, a legacy path drops the
  submitted credentials into a string-built query and honours the result.
- **Exploit:** POST /login with email `admin@hexaelectro.local' -- ` and any password →
  the password condition is commented out; you are logged in as admin. `' OR '1'='1`
  style input lands on the first user row (also admin). Verified.
- **Impact:** Instant administrative takeover in a single request — the classic
  highest-severity finding on any login form.

## 16. User Enumeration via Auth Responses
- **OWASP:** A07 Identification & Authentication Failures — CWE-204 (Observable Response Discrepancy)
- **Location:** `POST /login` answers "No account found for that email." vs
  "Incorrect password for that account."; `POST /forgot` reveals a real reset link
  for existing accounts but stays vague for unknown ones.
- **Exploit:** Compare responses for `nadia@hexaelectro.local` and a made-up address
  on either flow — the difference confirms which accounts exist. Verified.
- **Impact:** A validated customer list for password spraying and targeted phishing.

## 17. Brute Force — No Rate Limiting on Login
- **OWASP:** A07 — CWE-307 (Improper Restriction of Excessive Authentication Attempts)
- **Location:** `POST /login` — failures are counted for the lab's detection but
  never throttled, delayed or locked.
- **Exploit:** 10 (or 10,000) wrong passwords for one account — every attempt is
  processed at full speed. Verified.
- **Impact:** Credential stuffing turns public password leaks into account takeovers.

## 18. Default Administrator Credentials
- **OWASP:** A07 — CWE-1392 (Use of Default Credentials)
- **Location:** The seeded admin account `admin@hexaelectro.local` / `Admin@123`
  (pattern documented in the README, as shipped defaults are).
- **Exploit:** Log in with the documented default password. Verified.
- **Impact:** If a real deployment kept them, the shop is owned on day one.

## 19. Weak Password Policy at Registration
- **OWASP:** A07 — CWE-521 (Weak Password Requirements)
- **Location:** `POST /register` — no length or complexity check of any kind.
- **Exploit:** Register with the password `a` — the account is created. Verified.
- **Impact:** Customer accounts protected by one-character passwords.

## 20. Stored XSS via Display Name
- **OWASP:** A03 Injection — CWE-79 (Stored XSS)
- **Location:** The account name is rendered **unescaped** in the top navigation of
  every page (`layout()`), and names are accepted at registration and profile update.
- **Exploit:** Set your name to `<script>alert(1)</script>` — the payload is stored
  and served on every page render. Verified.
- **Impact:** Persistent script execution for the account holder — and for anyone a
  future feature shows that name to (support/admin views).

## 21. Mass Assignment on Profile Update
- **OWASP:** A01 Broken Access Control — CWE-915 (Mass Assignment)
- **Location:** `POST /profile` also honours fields the form never shows: `role`
  and `tradeInCredit` are copied onto the account object.
- **Exploit:** POST /profile with `role=admin` → your account's real server-side role
  becomes admin (no cookie tricks). Or set `tradeInCredit=9999`. Verified.
- **Impact:** Self-service privilege escalation / balance forgery from a settings form.

## 22. SQL Injection in Product Search
- **OWASP:** A03 Injection — CWE-89
- **Location:** `GET /search?q=` — the legacy catalogue search builds
  `SELECT … WHERE name LIKE '%<q>%' …` by concatenation and echoes the query back.
- **Exploit:** Search `' OR '1'='1` → the always-true condition returns the entire
  catalogue. Verified.
- **Impact:** The foothold for full database extraction on a SQL-backed deployment.

## 23. Reflected XSS in Search
- **OWASP:** A03 Injection — CWE-79 (Reflected XSS)
- **Location:** `GET /search` — the term is reflected unescaped in "Results for: …"
  and in the echoed query string.
- **Exploit:** Search `<script>alert(1)</script>` — it lands in the page raw. Verified.
- **Impact:** Crafted search links execute script on the shop's trusted origin.

## 24. Negative Quantity Tampering
- **OWASP:** A04 Insecure Design / Business Logic — CWE-472 / CWE-20
- **Location:** `POST /cart/add` believes the submitted quantity verbatim (zero and
  negatives included); checkout sums the line into the total.
- **Exploit:** Add an item with `qty=-2`, then check out — the order total drops by
  twice the item's price. Verified.
- **Impact:** Expensive items offset by negative lines; totals driven to $0.

## 25. Order IDOR — Reading Other Customers' Orders
- **OWASP:** A01 Broken Access Control — CWE-639 (IDOR)
- **Location:** `GET /order/:id` checks only that you are logged in, never that the
  order is yours. Ids are sequential.
- **Exploit:** As Tanvir, open `/order/5001` — Nadia's order, with per-unit serial
  numbers, is served in full. Verified.
- **Impact:** Every customer's purchase history and device serials exposed — feeds
  warranty fraud (#3) and phishing.

## 26. Serial Lookup Leaks Owner PII (Single-Request Exposure)
- **OWASP:** A01 / A03 Excess Data Exposure — CWE-200 / CWE-359
- **Location:** `GET /warranty/lookup?serial=` — **no authentication**, and a single
  lookup already returns the owner's name + email (the enumeration angle is #4;
  this entry is the per-request disclosure itself).
- **Exploit:** `curl "http://127.0.0.1:3011/warranty/lookup?serial=HE100001"` with no
  cookies → Nadia's name, email, product and warranty dates. Verified.
- **Impact:** Anonymous, per-request PII disclosure about any device owner.

## 27. Invoice Access Without Authorisation (IDOR)
- **OWASP:** A01 Broken Access Control — CWE-639 (IDOR)
- **Location:** `GET /invoice/:id` — served to anyone who asks (no login, no
  ownership check); ids are small sequential integers. (The upload flaw is #13.)
- **Exploit:** Open `/invoice/1` as another user — or with no session at all —
  Nadia's invoice document is served as `text/html`. Verified.
- **Impact:** All customer invoices public by URL: names, purchases and prices,
  ready-made for invoice fraud.

---

### Combination chains worth practising
- **#4 → #3:** enumerate serials, then file claims on strangers' devices.
- **#12 → #6 (real admin):** reset the admin password instead of forging the cookie.
- **#11 → #12:** CSRF the email change, then "forget password" on the new address.
- **#2 + #1:** zero-cost orders even where one control is later fixed.
