# HexaCraft — Practice Guide (LAB 7)

HexaCraft is **LAB 7** in the HexaCyberLab sequence. It starts **locked**: paste
the completion key you earned at 100% in Lab 6 to open it.

Every challenge below is a live test in the lab's registry. The lab **detects
each successful exploit itself** — open the **Mission page (`/tests`)** to watch
your progress bar move, and use the graded hints beside each test (they mirror
the hints here). The **Lab Assistant** (chat widget, bottom-right) will walk you
through a feature step by step — but only after you have genuinely tried that
feature **at least 3 times**; it keeps count. Your progress is saved in
`progress.json`: leave any time and resume exactly where you stopped.

Accounts: admin `admin@hexacraft.local`/`Admin@123` · sellers `shopa@`/`shopb@`/`shopc@hexacraft.local`/`Seller@123` · buyers `ruma@`/`karim@`/`sara@hexacraft.local`/`User@123`.

---

## Feature: Login & Authentication

### A1 — SQL injection login bypass · Intermediate
- **Objective:** End up logged in as the admin without knowing any password, via the login form alone.
- Hint 1: The login form has a second, legacy lookup path that builds its query by gluing your input into a string.
- Hint 2: Try a classic tautology in the email field — something that makes the WHERE clause always true.
- Hint 3: Email: `' OR '1'='1` — any password. You land in the first account the query returns: the admin.

### A2 — Brute force · Beginner
- **Objective:** Prove the login accepts unlimited attempts: 10 failed logins for one account are all processed with no lockout, delay or CAPTCHA.
- Hint 1: How many wrong passwords can you try for one account in a minute?
- Hint 2: Nothing slows you down — no counter, no lockout, no CAPTCHA. Script it.
- Hint 3: Send 10+ failed logins for `ruma@hexacraft.local`; the 10th is still processed like the 1st.

### A3 — User enumeration · Beginner
- **Objective:** Demonstrate you can tell whether an email is registered, using only the app's own responses (observe both a "wrong password" and a "no account" style answer).
- Hint 1: Compare the login error for an email that exists with one that does not.
- Hint 2: The forgot-password flow answers differently too — one shows a reset link, the other a generic note.
- Hint 3: Probe `/login` once with `ruma@hexacraft.local` (wrong password) and once with an invented email; the two different messages confirm which accounts exist.

### A4 — Predictable password-reset token · Intermediate
- **Objective:** Reset the **admin** password without ever seeing a reset email.
- Hint 1: The lab shows you a reset link — study how its token is built.
- Hint 2: The token depends only on something public about the account. Compute it offline.
- Hint 3: token = first 8 hex characters of `md5(email)`. Compute it for `admin@hexacraft.local` and open `/reset` with it.

### A5 — Weak password policy · Beginner
- **Objective:** Create a new account whose password is shorter than 6 characters.
- Hint 1: What is the shortest password the registration form accepts?
- Hint 2: Try registering with a 1-character password.
- Hint 3: Register a fresh account with password `x` — it is created, proving there is no minimum length or complexity rule.

## Feature: Accounts & Profile

### P1 — Mass assignment on profile · Intermediate
- **Objective:** Turn your ordinary buyer account into a real admin account (check the Role on `/profile` afterwards).
- Hint 1: The profile form only shows a name field — but what does the endpoint do with extra fields?
- Hint 2: The server copies submitted fields onto your user record. Which field controls your powers?
- Hint 3: POST `/profile` with name plus `role=admin`. Your account record itself becomes admin.

## Feature: Search & Catalogue

### S1 — SQL injection in search · Intermediate
- **Objective:** Make the search return the **UNLISTED DRAFT** product that no normal search or page ever shows.
- Hint 1: The catalogue search builds its query from your text the same legacy way the login does.
- Hint 2: A tautology does not just match everything — ask what else is in the table that the catalogue never shows.
- Hint 3: Search for `' OR '1'='1` — an unlisted draft product appears.

### S2 — Reflected XSS in search · Beginner
- **Objective:** Get a `<script>` payload reflected unescaped into the search results page.
- Hint 1: The results page repeats your search term back to you. In what form?
- Hint 2: View the page source after searching for a tag.
- Hint 3: Search for `<script>alert(1)</script>` — your input is written into the page unescaped and executes.

## Feature: Seller Products

### SP1 — Cross-seller product tampering · Intermediate
- **Objective:** As Seller A, change the price of a Woodland Crafts product and prove it on the public product page (or delete one of their products).
- Hint 1: Your dashboard edit links follow a pattern. Whose products does the pattern reach?
- Hint 2: Log in as Seller A and open the edit URL of a Woodland Crafts product (IDs 6–10).
- Hint 3: Save a change (or POST the delete) on product 6 as Seller A — it applies, although the product belongs to Seller B.

### SP2 — Commission = 0 · Intermediate
- **Objective:** Make a shop page display "commission on this shop: 0%".
- Hint 1: Create/edit product forms carry more than you can see. View source.
- Hint 2: A hidden field decides what the marketplace keeps. Who chooses its value?
- Hint 3: Intercept the product save and set `commission=0`. The shop's rate becomes 0% — fees erased.

### SP3 — Stored XSS in product description · Intermediate
- **Objective:** Store a payload in a product description that fires when the product page is viewed.
- Hint 1: One field in the whole app is rendered raw while everything else is escaped.
- Hint 2: It is the field buyers and admins read on every product page.
- Hint 3: As a seller set a product description to `<script>alert(document.cookie)</script>` and view the product.

### SP4 — Malicious upload · Intermediate
- **Objective:** Host an HTML page under the lab's own origin via the seller file upload.
- Hint 1: The product-image uploader never asks what the file really is.
- Hint 2: The server picks a Content-Type from the file NAME you give it.
- Hint 3: Upload a file named `promo.html` with HTML/JS content, then open it from the product page — it is served as `text/html` and runs.

## Feature: Reviews

### R1 — Review your own product · Beginner
- **Objective:** As Seller A, get a 5★ review written by yourself to appear on your own product page.
- Hint 1: Who is allowed to post a review? Is the product's owner excluded?
- Hint 2: The review form appears for every logged-in user — including the seller of that very product.
- Hint 3: As Seller A, post a 5-star review on your own product #1. It publishes under your name.

### R2 — Delete the negative review · Beginner
- **Objective:** As Seller A, remove Karim's 2★ review from product #1.
- Hint 1: Look at the buttons under reviews on your own product page.
- Hint 2: The delete control is offered to the product's seller — the very person the review criticises.
- Hint 3: As Seller A, delete Karim's 2-star review on product #1. It disappears for everyone.

## Feature: Cart & Checkout

### C1 — $0.01 checkout · Beginner
- **Objective:** Create an order whose total is $0.01 for an item priced above $30.
- Hint 1: The cart page helpfully posts the prices back to the server. In editable fields.
- Hint 2: Checkout never re-checks them against the catalogue.
- Hint 3: Edit the hidden `total` (or `price_<id>`) in the cart form to `0.01` and check out.

### C2 — Negative quantity · Intermediate
- **Objective:** Create an order in which a line quantity is negative and the total drops because of it.
- Hint 1: The cart form also posts a quantity per line. What values does checkout accept?
- Hint 2: The add-to-cart form clamps quantity — the checkout form does not re-validate it.
- Hint 3: POST `/checkout` with `qty_<id>=-5` for an item in your cart. The line total goes negative.

### C3 — Coupon reuse · Beginner
- **Objective:** Complete 2 checkouts as the same buyer, both discounted by `CRAFT10`.
- Hint 1: The app records every coupon use. Does it ever say no?
- Hint 2: `CRAFT10` works on your first checkout. Try it on your second, third…
- Hint 3: Complete two checkouts with `CRAFT10` as the same buyer — the 10% discount applies every single time.

## Feature: Orders

### O1 — Order IDOR · Beginner
- **Objective:** View another buyer's order and name one piece of their PII you learned.
- Hint 1: Order URLs are short numbers. What happens when you change one?
- Hint 2: Your own orders start at `/orders/1` — whose are 2 and 3?
- Hint 3: Login as Ruma and open `/orders/2` — Karim's order, name, email and items are all shown.

### O2 — Fake best-seller · Intermediate
- **Objective:** Raise a product's public "sold" counter without paying anything, and turn a Pending order Paid.
- Hint 1: Order pages carry a "complete order" link. What does it verify before marking Paid?
- Hint 2: Nothing — and it also moves the public "sold" numbers.
- Hint 3: Visit `/orders/2/complete` repeatedly: the order turns Paid and the product's sold counter climbs every time.

## Feature: Payouts & Shop Settings

### PS1 — Payout CSRF · Advanced
- **Objective:** Change a seller's payout account with a request that carries **no** `hx_tok` token (as a cross-site form would send), and confirm the new account on the payout page.
- Hint 1: Payout settings change bank details instantly. What proves the request came from the seller's intent?
- Hint 2: There is no password re-entry and the anti-CSRF token is never verified — a cross-site form can submit it.
- Hint 3: POST `/seller/payout` with attacker account details and NO `hx_tok` field (or a foreign Origin) while logged in as a seller — it applies silently.

### PS2 — Instant verified + featured + 0% shop · Advanced
- **Objective:** In a single shop-settings request, make your shop show ✔ verified AND ⭐ featured AND 0% commission on the public catalogue.
- Hint 1: The shop-settings endpoint copies more than the form shows.
- Hint 2: Which shop fields do buyers trust on sight? Badges. Which field does the marketplace live on? Commission.
- Hint 3: Add `verifiedSeller=true&featured=true&commissionRate=0` to the shop-settings POST — all three are applied.

## Feature: Admin Panel

### AD1 — Cookie role tampering · Beginner
- **Objective:** Reach `/admin` **without** logging in as admin.
- Hint 1: The admin gate reads something your browser sends. It is not the session.
- Hint 2: DevTools → Application → Cookies shows two cookies after login. One of them names your powers.
- Hint 3: Set the `role` cookie to `admin` (no admin login needed) and open `/admin` — full dashboard, payout accounts included.

---

## 🏁 At 100%

When every test is complete, the **completion page (`/complete`)** unlocks with:
a full summary of the lab (features, per-feature vulnerability counts, the ways
you tested, what you learned, what each flaw would mean for a real client, and
how to write it in a real report) — the **completion key for Lab 8** — and your
**certificate** with the HexaCyberLab logo.
