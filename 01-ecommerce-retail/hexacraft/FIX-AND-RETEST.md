# HexaCraft — Fix & Retest Guide

For each planted flaw: the secure implementation pattern, a regression test to
prove the fix, and why the remediation works. Apply fixes to a **copy** of
`server.js` so the vulnerable original stays available for practice.

---

## 1. Seller isolation (edit/delete any product)
- **Fix:** On every product mutation, verify ownership server-side: `if (product.shopId !== user.shopId) return 403`. Load edit forms through the same check.
- **Regression test:** As Seller A, `POST /seller/products/6/edit` → expect **403**, and product #6 unchanged on its public page.
- **Why:** Authorization must be enforced per-object on the server; hiding links in the UI is not a control.

## 2. Commission tampering
- **Fix:** Never accept pricing/fee fields from the client. Drop the hidden `commission` field; always read the rate from the shop record (admin-managed only).
- **Regression test:** Save a product with `commission=0` injected into the request → shop commission still shows the admin-set rate.
- **Why:** Financial parameters are server-owned data; anything in a request body is attacker-controlled.

## 3. Payout change without verification + CSRF
- **Fix:** (a) Require password re-entry (or step-up auth) for payout changes, plus email confirmation of the change. (b) Add a per-session CSRF token to all state-changing forms and verify it server-side; set session cookies `SameSite=Lax`.
- **Regression test:** Submit the payout form without/with a wrong token → **403**; submit without re-entered password → rejected; a cross-site auto-post changes nothing.
- **Why:** Money-movement settings need both proof of *who* (re-auth) and proof of *intent* (CSRF token).

## 4. Sellers reviewing own products
- **Fix:** Server-side rule: `if (product.shopId === user.shopId) reject`. Also require a verified purchase of the product before reviewing.
- **Regression test:** As Seller A, POST a review on own product → rejected and no review appears.
- **Why:** Review integrity rules are business invariants; they belong in server logic, not in which forms are displayed.

## 5. Sellers deleting reviews on their products
- **Fix:** Only the review's author (or admin/moderation with an audit log) may delete. Sellers get a "report review" flow instead.
- **Regression test:** As the product's seller, POST `/reviews/<negative-id>/delete` → **403**, review still visible.
- **Why:** Letting the reviewed party erase criticism is a conflict of interest; moderation must be independent.

## 6. Fake sales via order-complete endpoint
- **Fix:** Order status may only change via a verified payment-provider webhook (signature-checked, idempotent). The complete action must be a POST, restricted to the order's buyer, and a no-op when repeated.
- **Regression test:** Call `/orders/2/complete` three times logged-in and logged-out → status stays `Pending`, sales counters unchanged.
- **Why:** State transitions that move money/reputation require proof of the external event (payment), not a URL visit.

## 7. Price tampering at checkout
- **Fix:** Ignore all client-sent prices. Recompute the total on the server from the catalogue by product ID and quantity at checkout time.
- **Regression test:** Tamper `total`/`price_<id>` in the checkout request → order total equals the true catalogue total.
- **Why:** Prices are server data. The client's only inputs are *what* and *how many*.

## 8. Order IDOR
- **Fix:** Scope order reads to the owner: `if (order.buyerId !== user.id && user.role !== 'admin') return 404/403`. Sellers see only their own line items via their dashboard.
- **Regression test:** As Ruma, GET `/orders/2` (Karim's) → **403/404**, no PII in the response.
- **Why:** Every object access needs an ownership/authorization check — unguessable IDs are not a substitute.

## 9. Stored XSS in product description
- **Fix:** Escape all user content on render (the app already has `esc()` — apply it to `desc`), or sanitize with an allowlist sanitizer if rich text is truly needed. Add a Content-Security-Policy header.
- **Regression test:** Save `<script>alert(1)</script>` as a description → the product page shows it as inert text, nothing executes.
- **Why:** Output encoding at the render point neutralizes stored payloads for every viewer, including admins.

## 10. Role cookie → admin
- **Fix:** Never trust client-supplied role data. Read the role from the server-side session/user record on every request; ignore the `role` cookie entirely (delete it).
- **Regression test:** Set cookie `role=admin` without an admin session → `/admin` returns **403**; with a buyer session → also **403**.
- **Why:** Authorization data must live where the client cannot write to it — the server.

## 11. Unrestricted file upload
- **Fix:** Allowlist file types (jpg/png/webp), verify magic bytes, store outside the web root with generated names, serve images with an explicit safe `Content-Type` and `Content-Disposition`, and never serve user HTML from the app origin.
- **Regression test:** Upload `promo.html` → rejected (or stored but served as a download/`text/plain` that does not execute).
- **Why:** Uploaded content is untrusted data; type enforcement + safe delivery removes stored-XSS-via-file and phishing hosting.

## 12. Predictable reset token
- **Fix:** Generate tokens with `crypto.randomBytes(32)`, store only a hash server-side, bind to the user, expire after ~15 minutes, single-use, invalidate on password change.
- **Regression test:** `md5(email)`-derived tokens no longer work; a token cannot be reused after one successful reset; an expired token is rejected.
- **Why:** Reset tokens are bearer credentials — they must be unguessable, short-lived and one-time.

## 13. Unlimited coupon reuse
- **Fix:** Enforce redemption rules server-side: per-user and global usage caps checked in a transaction at checkout (`if uses >= limit reject`).
- **Regression test:** Second checkout with `CRAFT10` by the same buyer → discount not applied, clear message shown.
- **Why:** Promotion rules are financial controls; recording usage without enforcing it is not a control.

## 14. Mass assignment on shop settings
- **Fix:** Bind an explicit allowlist (`name`, `bio`) from the request; never copy arbitrary keys. Admin-only fields (`verifiedSeller`, `featured`, `commissionRate`) change only through admin endpoints with their own authorization.
- **Regression test:** POST shop settings with `verifiedSeller=true&featured=true&commissionRate=0` added → badges and rate unchanged.
- **Why:** The server decides which fields a role may modify — the request must never define the writable surface.

## 15. SQL injection login bypass
- **Fix:** Kill the string-built lookup entirely: fetch the user by email with a parameterised query, then compare the password hash in constant time. No code path may treat credentials as query text.
- **Regression test:** Login with email `' OR '1'='1` and any password → normal "invalid credentials"; the real admin credentials still work.
- **Why:** Parameter binding separates data from query logic — the injected text can only ever be an (unknown) email string.

## 16. Brute force — no rate limiting
- **Fix:** Throttle login attempts per account and per IP (e.g. exponential backoff after 5 failures, temporary lockout, CAPTCHA step-up), and alert on spikes.
- **Regression test:** Script 10 rapid failed logins for one account → attempts are delayed/refused (429/lockout message) well before the 10th; a correct login after the cooldown still works.
- **Why:** Guessing must be made economically useless; unlimited full-speed attempts guarantee eventual compromise of weak passwords.

## 17. User enumeration
- **Fix:** One generic response for every authentication failure ("Invalid email or password") and one generic reset response regardless of whether the account exists; keep timing similar.
- **Regression test:** Login with an existing email + wrong password and with a non-existent email → byte-identical messages; `/forgot` answers identically for both.
- **Why:** If the app confirms which accounts exist, every other attack (phishing, spraying) gets a verified target list for free.

## 18. Weak password policy
- **Fix:** Enforce a real policy at registration and reset: minimum 12 characters, reject passwords found in known breach corpora, allow long passphrases.
- **Regression test:** Register with password `x` (or any <12-char/common password) → rejected with a policy message; a strong passphrase registers fine.
- **Why:** Policy is the only control over the weakest credentials in the database; users optimise for convenience unless the app refuses.

## 19. Mass assignment on profile update
- **Fix:** Bind an explicit allowlist (`name`) on profile update; role/shop changes happen only through dedicated, authorised admin flows.
- **Regression test:** POST `/profile` with `role=admin` added → profile saves the name only; the account's role is unchanged and `/profile` still shows the original role.
- **Why:** Same principle as #14, applied to the user model: the request body must never define which fields are writable.

## 20. SQL injection in product search
- **Fix:** Parameterise the search query and always filter to published products (`hidden = 0`) in the query itself, regardless of input.
- **Regression test:** Search `' OR '1'='1` → only products whose names literally match (none) — and in particular the UNLISTED DRAFT product never appears; a normal search still finds matching products.
- **Why:** Search is a query builder like any other; unlisted rows must be excluded by the query, not by hoping the input behaves.

## 21. Reflected XSS in search
- **Fix:** HTML-encode the search term (and every reflected value) at render; add a Content-Security-Policy header as defence in depth.
- **Regression test:** Search `<script>alert(1)</script>` → the results page shows the text inertly (`&lt;script&gt;` in source); nothing executes.
- **Why:** Reflected data lands in HTML context — encoding at the sink removes the injection while keeping the echo feature.

## 22. Quantity tampering at checkout
- **Fix:** Ignore client-sent quantities entirely; take quantities from the server-side cart, and validate every quantity as a positive integer at add-to-cart AND at checkout.
- **Regression test:** POST checkout with `qty_<id>=-5` injected → order is created with the cart's real quantity and the correct total (or rejected); a normal checkout is unaffected.
- **Why:** Quantities are money math — any client-controlled number that reaches a total is a pricing vulnerability.
