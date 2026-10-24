# HexaCraft — Complete Vulnerability Map (LAB 7)

**22 intentional vulnerabilities**, grouped by feature — this is the lab's full
test registry (the same list the Mission page at `/tests` tracks). Every flaw is
live and exploitable in the running lab, and the lab **detects each successful
exploit itself** and advances your progress. Restart resets the shop data;
progress lives in `progress.json` and persists (delete it for a full reset).

---

## Feature: Login & Authentication

### A1. SQL injection login bypass
- **OWASP:** A03:2021 Injection
- **Location:** `POST /login` (legacy lookup path)
- **Steps:** Submit the login form with email `' OR '1'='1` and any password. The string-built "query" matches the first row — you are logged in as the **admin**.
- **Impact:** Full account takeover with no password; the first matched account is the most privileged one.

### A2. Brute force — no rate limiting or lockout
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Location:** `POST /login`
- **Steps:** Send 10+ wrong passwords for one account (e.g. `ruma@hexacraft.local`). Every attempt is processed at full speed; nothing throttles, delays or locks.
- **Impact:** Unlimited password guessing against any known account.

### A3. User enumeration via differing responses
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Location:** `POST /login`, `POST /forgot`
- **Steps:** Compare the responses: a registered email with a wrong password returns **"Wrong password."**; an unregistered email returns **"No account with that email."** The forgot flow also behaves visibly differently (reset link vs generic note).
- **Impact:** Attackers build a verified list of customer emails for targeted phishing and credential attacks.

### A4. Predictable password-reset token
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Location:** `/forgot`, `/reset` — token = first 8 hex chars of `md5(email)`
- **Steps:** Compute `md5("admin@hexacraft.local")`, take the first 8 characters, open `/reset?email=admin@hexacraft.local&token=<computed>` and set a new admin password.
- **Impact:** Full account takeover of **any** account (including admin) knowing only the victim's email.

### A5. Weak password policy at registration
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Location:** `POST /register`
- **Steps:** Register a new account with the password `x`. It is accepted — there is no minimum length or complexity rule at all.
- **Impact:** The user base fills with instantly guessable passwords.

## Feature: Accounts & Profile

### P1. Mass assignment on profile update
- **OWASP:** A03:2021 / API3 Mass Assignment
- **Location:** `POST /profile`
- **Steps:** While logged in as a buyer, intercept the profile save and add `role=admin`. The endpoint copies extra fields onto your user record — your real account role becomes **admin**.
- **Impact:** Self-service privilege escalation from any free account to full platform control.

## Feature: Search & Catalogue

### S1. SQL injection in product search
- **OWASP:** A03:2021 Injection
- **Location:** `GET /search?q=`
- **Steps:** Search for `' OR '1'='1`. The always-true condition returns **every** product row — including the **UNLISTED DRAFT** wholesale listing that no page links to and normal search never shows.
- **Impact:** Full catalogue (incl. draft/unreleased products and pricing) dumped through the search box.

### S2. Reflected XSS in search results
- **OWASP:** A03:2021 Injection (XSS)
- **Location:** `GET /search` — the term is echoed into the results heading unescaped
- **Steps:** Search for `<script>alert(1)</script>` and view the results page source — your payload is written into the page raw and executes.
- **Impact:** Crafted search links run script in victims' sessions on the marketplace's own domain.

## Feature: Seller Products

### SP1. Broken seller isolation — edit/delete another seller's product (IDOR)
- **OWASP:** A01:2021 Broken Access Control
- **Location:** `POST /seller/products/:id/edit`, `POST /seller/products/:id/delete`, `GET /seller/products/:id/edit`
- **Steps:** Login as Seller A (`shopa@`). Open `/seller/products/6/edit` (a Woodland Crafts product owned by Seller B). Change the name/price and save — or POST to `/seller/products/6/delete`.
- **Impact:** A competitor seller can sabotage rival listings (price → $0.01, delete best-sellers), destroying trust and revenue.

### SP2. Commission tampering via hidden form field
- **OWASP:** A04:2021 Insecure Design / business-logic flaw
- **Location:** Product create/edit forms (hidden `commission` field), applied in `POST /seller/products` and `POST /seller/products/:id/edit`
- **Steps:** As any seller, edit a product; intercept the save request (or edit the page source) and set `commission=0`. Save. The shop page now shows "commission on this shop: 0%".
- **Impact:** Sellers silently opt out of marketplace fees — direct revenue loss on every sale, invisible in normal UI flows.

### SP3. Stored XSS in product description
- **OWASP:** A03:2021 Injection (XSS)
- **Location:** Product `desc` — rendered **unescaped** on `GET /products/:id`
- **Steps:** As a seller, edit a product and set the description to `<script>alert(document.cookie)</script>` (or an `<img onerror>` payload). Every buyer/admin who views the product executes it.
- **Impact:** Session theft and actions-as-victim for every viewer, including admins — a seller-to-admin privilege escalation path.

### SP4. Unrestricted product-file upload (stored HTML served)
- **OWASP:** A03:2021 / A08:2021 (unsafe file handling)
- **Location:** `POST /seller/products/:id/image`, served at `GET /uploads/:id/:filename`
- **Steps:** As a seller, on a product's edit page upload a file named `promo.html` whose content is an HTML page with a script. Open the file link from the product page — it is served as `text/html` from the lab's own origin and executes.
- **Impact:** Stored XSS / phishing pages hosted on the trusted marketplace domain; defacement.

## Feature: Reviews

### R1. Review manipulation — sellers review their own products
- **OWASP:** A04:2021 Insecure Design (missing business rule)
- **Location:** `POST /products/:id/reviews`
- **Steps:** Login as Seller A, open one of your own products, post a glowing 5★ review. It appears publicly under your own name.
- **Impact:** Fake social proof inflates conversion on the seller's listings and poisons the review system's credibility.

### R2. Review suppression — sellers delete negative reviews on their products
- **OWASP:** A01:2021 Broken Access Control
- **Location:** `POST /reviews/:id/delete`
- **Steps:** Login as Seller A. Open your product that has a 2★ review (product #1, Karim's review). Click **Delete review** — it disappears.
- **Impact:** Sellers can curate away all criticism; buyers lose the warning signal, returns/complaints rise, platform trust erodes.

## Feature: Cart & Checkout

### C1. Price tampering at checkout
- **OWASP:** A04:2021 Insecure Design (client-side price trust)
- **Location:** `GET /cart` renders hidden `price_<id>` + `total` fields; `POST /checkout` trusts them
- **Steps:** Add an item to the cart, open the cart, edit the hidden `total` field in dev tools (e.g. `0.01`), checkout. The order is created at the tampered total.
- **Impact:** Buyers purchase at arbitrary prices; finance reconciliation fails because orders disagree with the catalogue.

### C2. Quantity tampering — negative quantities at checkout
- **OWASP:** A04:2021 Insecure Design
- **Location:** Hidden `qty_<id>` fields posted by the cart form; `POST /checkout`
- **Steps:** With an item in your cart, intercept checkout and set `qty_<id>=-5`. The line total goes negative and drags the order total down — add-to-cart clamps quantity, checkout never re-validates it.
- **Impact:** Orders can be turned into credits; expensive baskets cost nothing (or less).

### C3. Unlimited coupon reuse
- **OWASP:** A04:2021 Insecure Design (business logic)
- **Location:** `POST /checkout` coupon handling
- **Steps:** Checkout with `CRAFT10` (10% off). Repeat on every future order — the discount applies every time; usage is recorded but never limited.
- **Impact:** Permanent 10% margin leak; coupon codes shared publicly become an unofficial sitewide discount.

## Feature: Orders

### O1. Order IDOR — view any buyer's order
- **OWASP:** A01:2021 Broken Access Control
- **Location:** `GET /orders/:id`
- **Steps:** Login as Ruma (buyer). Visit `/orders/2` — Karim's order, with his name, email, items and prices, is fully visible.
- **Impact:** Customer PII and purchase-history disclosure; enables targeted phishing and competitive snooping.

### O2. Fake sales — order-complete endpoint with no payment check
- **OWASP:** A04:2021 Insecure Design / business-logic flaw
- **Location:** `GET /orders/:id/complete`
- **Steps:** Login as anyone. Visit `/orders/2/complete` — the unpaid order becomes **Paid** and each product's public "sold" counter increases. Repeat the visit; the counter keeps rising.
- **Impact:** Inflated best-seller rankings and fake sales stats; "paid" orders that never paid can trigger fulfilment/payouts.

## Feature: Payouts & Shop Settings

### PS1. Payout-account hijack — no verification + CSRF
- **OWASP:** A01:2021 Broken Access Control / CSRF (missing token verification)
- **Location:** `POST /seller/payout`
- **Steps:** (a) As a seller, change the payout bank/account — it applies instantly with no password re-entry or email confirmation. (b) CSRF: the form carries an `hx_tok` token that the server **never verifies** — host a page with an auto-submitting form to `http://127.0.0.1:3015/seller/payout` containing attacker account details (and no token); when a logged-in seller visits it, their payout account is silently replaced.
- **Impact:** Marketplace payouts (real money) can be redirected to an attacker's account; the legitimate seller may not notice until payday.

### PS2. Mass assignment on shop settings
- **OWASP:** A03:2021 / API3 Mass Assignment
- **Location:** `POST /seller/shop`
- **Steps:** As a seller, intercept the shop-settings save and add fields the form never offered: `verifiedSeller=true&featured=true&commissionRate=0`. The shop instantly gains the ✔ verified badge, ⭐ featured placement, and a 0% commission.
- **Impact:** Sellers forge platform trust signals (verified/featured drive clicks and sales) and again erase their fees.

## Feature: Admin Panel

### AD1. Role tampering via cookie → admin
- **OWASP:** A01:2021 Broken Access Control / A07:2021 Identification & Authentication Failures
- **Location:** `/admin` trusts the client-set `role` cookie
- **Steps:** In the browser, set a cookie `role=admin` for the site (no login needed). Visit `/admin` — full admin dashboard: all sellers, payout accounts, commissions, disputes.
- **Impact:** Complete administrative compromise of the marketplace from a single forged cookie.
