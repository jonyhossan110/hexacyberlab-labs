# HexaFashion — Vulnerability Guide

All 24 flaws below are **intentional** and reproduce in the running lab. Each one is a **scored test** in the lab system (see the 🎯 Tests page in the running app — the server detects a successful exploit and completes the test automatically). Entries are grouped in the order of the original guide (1–14) followed by the feature-completeness additions (15–24). Unless stated otherwise, log in as `aisha@hexafashion.local / User@123` (customer) for the attacks. "Where it lives" points at the route and the mechanism in `server.js`.

---

## 1. Price Tampering at Checkout

- **OWASP:** A04 Insecure Design / A01 Broken Access Control (client-side trust) — CWE-472 External Control of Assumed-Immutable Web Parameter
- **Where:** `POST /checkout`. The checkout form carries each item's price in a hidden `price` field, and the server builds the order total **from the prices in the request body** instead of looking them up.
- **Exploit:**
  1. Add any product to the cart (e.g. Leather Biker Jacket, $199.99) and go to Checkout.
  2. Intercept the `POST /checkout` request in Burp Suite (or edit the hidden field with DevTools).
  3. Change `price=199.99` to `price=0.01` and send.
  4. Open the created order — the total charged is **$0.01**.
- **Impact:** Direct revenue loss on every order; the store ships real goods for whatever the attacker chooses to pay.

## 2. Size-Variant Price Manipulation (XL Surcharge)

- **OWASP:** A04 Insecure Design — CWE-472
- **Where:** `POST /checkout`. The premium-size surcharge is sent as a hidden `surcharge` field and trusted by the server.
- **Exploit:**
  1. Add an XL item with a surcharge (e.g. Wool Blend Overcoat XL, +$8) to the cart.
  2. At checkout, change `surcharge=8` to `surcharge=-50` in the request.
  3. Place the order — the "surcharge" is now a **discount**, reducing the total below the base price.
- **Impact:** Variant pricing integrity is lost; negative surcharges silently erode margin and corrupt sales reporting.

## 3. IDOR — View Another Customer's Order and Invoice

- **OWASP:** A01 Broken Access Control — CWE-639 Authorization Bypass Through User-Controlled Key (IDOR)
- **Where:** `GET /orders/:id` and `GET /orders/:id/invoice`. The handler loads the order by ID and never checks `order.userId` against the logged-in user.
- **Exploit:**
  1. Log in as Aisha. Your own order is `#1001`.
  2. Browse to `http://127.0.0.1:3010/orders/1002` — Karim's order, with his name, items and address.
  3. Browse to `/orders/1002/invoice` for his printable invoice, including his email and delivery address.
  4. IDs are sequential, so every order in the store can be enumerated.
- **Impact:** Full order-history privacy breach for all customers (names, addresses, purchase history) — a reportable data-protection incident in a real store.

## 4. IDOR — View and Approve Another Customer's Return

- **OWASP:** A01 Broken Access Control — CWE-862 Missing Authorization
- **Where:** `GET /returns`, `GET /returns/:id`, `POST /returns/:id/approve` and `/reject`. The returns queue lists **everyone's** requests to any logged-in user, and the approve/reject handlers perform **no ownership or admin check**.
- **Exploit:**
  1. Log in as Aisha (a regular customer).
  2. Open `/returns` — Karim's pending return `#501` is listed.
  3. Open `/returns/501` and click **Approve Refund** (or POST directly to `/returns/501/approve`).
  4. The status changes to "Approved — refund … issued". A customer just authorised a refund.
- **Impact:** Refund fraud at scale: any customer can approve refunds (including their own — see #5) without finance-team involvement.

## 5. Refund-Amount Tampering

- **OWASP:** A04 Insecure Design — CWE-472 / CWE-837 Improper Enforcement of a Single, Unique Action value
- **Where:** `POST /orders/:id/return` stores `refundAmount` **straight from the request body**; the approval step issues exactly that amount.
- **Exploit:**
  1. Buy (or open) a cheap order, e.g. the $29.99 scarf.
  2. On the order page, edit the **Refund amount** field from `29.99` to `9999` before submitting the return request (or intercept the POST).
  3. Approve the return (as admin — or yourself, via #4).
  4. The system records a **$9,999 refund** against a $29.99 purchase.
- **Impact:** Direct financial theft; refunds are decoupled from money actually received.

## 6. Role Tampering via Cookie (Customer → Admin)

- **OWASP:** A01 Broken Access Control / A02 Cryptographic Failures — CWE-565 Reliance on Cookies without Validation
- **Where:** session handling. The `hf_session` cookie is `base64url(JSON{uid, role, email})` — unsigned and client-editable — and `isAdmin()` trusts the `role` inside it.
- **Exploit:**
  1. Log in as Aisha and copy the `hf_session` cookie value.
  2. Base64-decode it: `{"uid":2,"role":"customer","email":"aisha@hexafashion.local"}`.
  3. Change `"role"` to `"admin"`, re-encode (base64url), and replace the cookie in your browser.
  4. Visit `/admin` — the full admin dashboard opens.
- **Impact:** Complete privilege escalation for every registered user: product, order and returns administration.

## 7. Mass Assignment on Profile Update

- **OWASP:** A01 / API3-style Excessive Data Assignment — CWE-915 Improperly Controlled Modification of Dynamically-Determined Object Attributes
- **Where:** `POST /profile`. The handler copies **every posted field** onto the user record (only `id/email/password/wishlist` are excluded), so attacker-added fields are persisted.
- **Exploit:**
  1. Log in as Aisha and intercept the profile-save request.
  2. Add parameters: `isAdmin=true&loyaltyTier=PLATINUM&role=admin`.
  3. Send. Reload `/profile` — the page now shows **Admin flag: true, Loyalty tier: PLATINUM**.
  4. Visit `/admin` — access granted via the `isAdmin` record flag even without touching the cookie.
- **Impact:** Privilege escalation and loyalty/points fraud through a routine settings form.

## 8. Stored XSS in Product Review

- **OWASP:** A03 Injection — CWE-79 Stored Cross-Site Scripting
- **Where:** `POST /products/:id/review` stores review text verbatim; the product page renders `r.text` **without HTML escaping**.
- **Exploit:**
  1. Log in and open any product (e.g. `/products/1`).
  2. Post a review containing: `<script>alert(document.cookie)</script>`
  3. Log out (or open the product as another user / the admin). The script executes in every visitor's browser.
- **Impact:** Session theft and account takeover of customers **and admins** who merely view the product page; defacement and phishing from a trusted page.

## 9. SQL-Injection-Style Search Bypass

- **OWASP:** A03 Injection — CWE-89 SQL Injection (simulated string-built query)
- **Where:** `GET /search?q=` → `runNaiveSearch()`. The app builds a query string `` `... LIKE '%${q}%' AND hidden = 0` `` from raw input and interprets it naively, so injected logic changes the result set.
- **Exploit:**
  1. Search normally for `dress` — only live products appear.
  2. Search for `' OR '1'='1` — the tautology makes the WHERE clause always true and the search returns **all products, including the hidden DRAFT items** with their internal wholesale costs ($120 / $210).
  3. Search for `' UNION SELECT email, role, loyaltyTier FROM users -- ` — the result page additionally dumps the **users table** (emails, roles, loyalty tiers).
- **Impact:** Exposure of unreleased product/pricing data and the customer account table — the classic first step to targeted account attacks.

## 10. CSRF on Profile / Address Change

- **OWASP:** A01 Broken Access Control — CWE-352 Cross-Site Request Forgery
- **Where:** `POST /profile` (and every other state-changing form) has **no anti-CSRF token** and no `SameSite` cookie attribute.
- **Exploit:**
  1. Log in as Aisha in your browser.
  2. In the same browser, open a malicious page containing an auto-submitting form:
     `<form action="http://127.0.0.1:3010/profile" method="POST"><input name="address" value="Attacker address"></form><script>document.forms[0].submit()</script>`
  3. The victim's delivery address is changed silently — the next order ships to the attacker.
- **Impact:** Silent account/profile manipulation; combined with checkout, goods can be redirected. (Combined with #7, a CSRF page can even set `isAdmin=true`.)

## 11. Predictable Password-Reset Token

- **OWASP:** A07 Identification and Authentication Failures — CWE-337 Predictable Seed / CWE-340 Predictability of Identifier
- **Where:** `POST /forgot`. The reset token is generated as `base64(email) + "." + userId` — fully deterministic, no randomness, no expiry.
- **Exploit:**
  1. You don't need the victim's inbox. For the admin account, compute the token offline:
     `base64("admin@hexafashion.local")` → `YWRtaW5AaGV4YWZhc2hpb24ubG9jYWw` + `.1` → token `YWRtaW5AaGV4YWZhc2hpb24ubG9jYWw.1`.
  2. First trigger a reset on `/forgot` for `admin@hexafashion.local` (so a token exists server-side).
  3. Browse to `/reset?token=YWRtaW5AaGV4YWZhc2hpb24ubG9jYWw.1` and set a new admin password.
  4. Log in as admin with your new password.
- **Impact:** Full account takeover of **any** account, including admin, knowing only the victim's email address.

## 12. Unrestricted Avatar File Upload (Stored XSS / RCE-class)

- **OWASP:** A04 / A08 — CWE-434 Unrestricted Upload of File with Dangerous Type
- **Where:** `POST /profile/avatar`. No extension, MIME or content checks; the file is stored and served from `/uploads/<filename>` with a content type derived from its extension (`.html` → `text/html`, `.svg` → `image/svg+xml`).
- **Exploit:**
  1. Log in, go to Profile → Profile photo.
  2. Upload a file named `avatar.html` containing `<script>alert('xss from uploaded file')</script>`.
  3. Open `http://127.0.0.1:3010/uploads/avatar.html` — the script runs in the site's origin. (An SVG with an embedded `<script>` works the same way.)
  4. Send the link to an admin/customer; script executes under the trusted store domain.
- **Impact:** Stored XSS under the store's own origin, drive-by malware hosting, defacement; in stacks that execute uploaded files, this class of flaw becomes remote code execution.

## 13. Coupon Stacking and Unlimited Reuse

- **OWASP:** A04 Insecure Design — CWE-837 / CWE-770 (missing business-logic limits)
- **Where:** `POST /checkout`. Every code in the `coupons` field is applied in sequence, codes can repeat within one order, and there is **no per-user or global usage tracking**.
- **Exploit:**
  1. Add any item to the cart and go to checkout.
  2. In the coupon field enter `VIP50,VIP50,VIP50` (or `FASHION20` repeated) — each application halves the remaining total again.
  3. Place the order: a $199.99 jacket costs **$25.00** after three VIP50 applications.
  4. Repeat on every future order — the same codes work forever, for everyone.
- **Impact:** Margin destruction and promo-abuse; "one-time" campaigns become permanent near-total discounts.

## 14. Gift-Card Code Enumeration (No Rate Limiting)

- **OWASP:** A07 / A04 — CWE-307 Improper Restriction of Excessive Authentication/Balance Attempts
- **Where:** `GET /giftcard/check?code=`. Codes are **sequential** (`HF-1000`…`HF-1009`) and the endpoint answers valid/invalid plus the **exact balance**, with no login, no throttling and no lockout.
- **Exploit:**
  1. Note the demo hint: cards were issued in the `HF-100x` range.
  2. Script the enumeration: `for i in $(seq 1000 1009); do curl -s "http://127.0.0.1:3010/giftcard/check?code=HF-$i"; done`
  3. Every card's validity and balance comes back, ready to spend at checkout.
- **Impact:** All outstanding gift-card value can be discovered and drained in seconds; in a real store this is direct monetary theft plus a support/refund burden.

## 15. SQL Injection Login Bypass

- **OWASP:** A03 Injection — CWE-89 SQL Injection (simulated string-built query)
- **Where:** `POST /login`. The legacy login path builds its lookup as a string, so an always-true condition injected into the email field changes the query's logic and the password check is never reached.
- **Exploit:**
  1. On the login form, enter the email: `admin@hexafashion.local' OR '1'='1'` (note both quotes — the value closes the string, injects an OR tautology, and the app's own trailing quote completes it).
  2. Enter any password at all and submit.
  3. You are logged in **as the admin**, with no knowledge of the admin password.
- **Impact:** Total authentication bypass: anyone can sign in as admin or any customer — account takeover without credentials.

## 16. No Brute-Force Protection on Login

- **OWASP:** A07 Identification and Authentication Failures — CWE-307 Improper Restriction of Excessive Authentication Attempts
- **Where:** `POST /login`. Failed attempts are never throttled: no lockout, no delay, no CAPTCHA, no alerting. (The lab counts failures purely so the test system can observe the attack — a real fix would use the count to block.)
- **Exploit:**
  1. Script ten (or ten thousand) wrong-password attempts against one account: `for i in $(seq 1 10); do curl -s -X POST http://127.0.0.1:3010/login --data 'email=karim@hexafashion.local&password=guess'$i; done`
  2. Every attempt is processed at full speed. With a password list, weak/reused passwords fall.
- **Impact:** Bulk password guessing and credential stuffing against the whole customer base.

## 17. Account Enumeration via Login & Reset Responses

- **OWASP:** A07 — CWE-204 Observable Response Discrepancy
- **Where:** `POST /login` and `POST /forgot`. The failure messages differ depending on whether the email exists: *"No account exists for that email address."* vs *"Incorrect password for that account."* — and the forgot form is equally talkative.
- **Exploit:**
  1. Try to log in with a real email (`aisha@hexafashion.local`) and a wrong password — note the message.
  2. Try an invented email — the message changes. Repeat on `/forgot` for a second oracle.
  3. Feed any email list through either endpoint and harvest which addresses hold accounts.
- **Impact:** Attackers build a verified list of the store's customers for targeted phishing and credential stuffing.

## 18. Weak Password Policy at Registration

- **OWASP:** A07 — CWE-521 Weak Password Requirements
- **Where:** `POST /register`. Any password is accepted — a single character passes.
- **Exploit:**
  1. Register a new account with the password `a`.
  2. The account is created and usable immediately.
- **Impact:** Customers pick trivial passwords; combined with #16/#17, their accounts are the first to fall.

## 19. Reflected XSS in Search Results

- **OWASP:** A03 Injection — CWE-79 Reflected Cross-Site Scripting
- **Where:** `GET /search`. The result count line prints the raw query back into the page (`Showing results for: <q>`) **without HTML encoding**, even though the heading escapes it.
- **Exploit:**
  1. Search for `<script>alert(document.domain)</script>`.
  2. The payload is reflected into the response as live markup and executes in the searcher's browser.
  3. Craft a search URL with the payload and send the link to a victim — classic reflected-XSS phishing under the store's own domain.
- **Impact:** Session theft and convincing on-domain phishing delivered through the store's own links.

## 20. Negative Quantity at Checkout

- **OWASP:** A04 Insecure Design — CWE-837 / improper input validation
- **Where:** `POST /checkout`. The cart form clamps quantity to ≥1, but the checkout handler reads `qty` straight from the request with no positivity or bounds check.
- **Exploit:**
  1. Intercept the checkout POST and set one line's `qty` to `-2`.
  2. Place the order: the line total is negative and drags the order total down — the store effectively pays you to take goods.
- **Impact:** Free or below-cost orders; inventory and revenue figures corrupted.

## 21. Overselling Beyond Stock (No Inventory Check)

- **OWASP:** A04 Insecure Design — CWE-770 / missing business-rule enforcement
- **Where:** `POST /checkout`. Per-size stock is displayed in the catalogue but never validated or decremented at checkout.
- **Exploit:**
  1. Pick a size with low stock (e.g. Wool Blend Overcoat XL — 4 in stock).
  2. Check out with `qty=999` for that size.
  3. The order is accepted in full — the shop has sold 995 coats it does not have.
- **Impact:** Oversold launches, cancelled orders, refunds and reputational damage; a competitor can sabotage a drop by "buying" all stock.

## 22. Stored XSS via Customer Name, Executed in the Admin Panel

- **OWASP:** A03 Injection — CWE-79 Stored Cross-Site Scripting
- **Where:** registration / profile `name`, rendered **raw** on the admin Customers page (`GET /admin/customers`). Most views escape the name; the back-office table does not — the classic "admin view was forgotten" pattern.
- **Exploit:**
  1. Register (or rename your profile) with the name `<script>alert(document.cookie)</script>`.
  2. Wait for — or socially engineer — an admin visit to **Admin → Customers**.
  3. The script executes in the admin's browser: session theft at maximum privilege.
- **Impact:** Store takeover from a single crafted registration; the most damaging XSS variant because the victim is the administrator.

## 23. Path Traversal in File Download

- **OWASP:** A01 Broken Access Control — CWE-22 Path Traversal
- **Where:** `GET /download?name=`. The endpoint exists to serve `logo.png`, but it resolves the `name` parameter into a filesystem path with no confinement check.
- **Exploit:**
  1. `GET /download?name=server.js` — the application's own source code is returned.
  2. `GET /download?name=../hexafashion-vuln-lab/progress.json` — or walk further with `../../` sequences toward any readable file.
- **Impact:** Source code, progress/state data and — on a real stack — configuration and credentials leak; frequently the first step to full compromise.

## 24. Unauthenticated Customer Data Exposure API

- **OWASP:** A01 / A05 — CWE-200 Exposure of Sensitive Information
- **Where:** `GET /api/users`. A convenience "export" API returns the **entire customer table as JSON — including plaintext passwords** — with no authentication at all.
- **Exploit:**
  1. `curl http://127.0.0.1:3010/api/users` — no login, no token.
  2. Harvest every email, role, loyalty tier, phone, address **and password**.
- **Impact:** An instant, reportable full-customer breach and a ready-made account-takeover kit for every customer who reuses passwords elsewhere.

---

### Cross-cutting weaknesses (bonus observations)

- **No rate limiting anywhere** — password-reset can also be brute-forced unthrottled (login is test #16).
- **Plaintext passwords** in the in-memory store, and the session cookie is unsigned (see #6).
- Order/return/invoice IDs are **sequential and predictable**, which is what makes the IDORs (#3, #4) trivially enumerable.
