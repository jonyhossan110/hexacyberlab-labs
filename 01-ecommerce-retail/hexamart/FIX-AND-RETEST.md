# HexaMart — Fix & Retest Guide

For each of the 23 tests in the registry: the secure implementation
pattern, and a regression test that must FAIL on the vulnerable build
and PASS on the fixed build. Fixes are described against this lab's
architecture (single Node.js file, in-memory store) but the patterns are
the production ones.

---

## Login & Authentication

### A1. SQL injection in login
- **Fix:** Authenticate with a parameterised query (prepared statement): the email and password are data, never query text. Remove any string-built "legacy" query path entirely; hash passwords (see A-cross-cutting) and compare in constant time where practical.
- **Regression test:** POST `/login` with email `admin@hexamart.local' OR '1'='1' --` and any password → normal 401, no session issued. The real admin credentials still log in.

### A2. Brute force — no rate limiting
- **Fix:** Rate-limit login per account and per IP (e.g. exponential backoff after 5 failures, lockout or CAPTCHA after 10), log and alert on bursts. Apply the same limits to password reset.
- **Regression test:** Script 10 failed logins for one account → attempts after the threshold are delayed/rejected (429/lockout message), not processed identically to the first.

### A3. User enumeration
- **Fix:** One generic response for every authentication failure ("Invalid email or password") and one generic reset response ("If that email exists, we've sent a link"), with identical timing as far as practical. Never reveal account existence in any auth-adjacent flow.
- **Regression test:** POST `/login` and `/forgot` with (a) a registered email + wrong password and (b) an unregistered email → responses are indistinguishable in text and status.

### A4. Predictable password-reset token
- **Fix:** Generate tokens with a CSPRNG (≥ 128 bits, e.g. `crypto.randomBytes(32)`), store only a hash, expire after 15–30 minutes, single-use, bound to the account — never derive from userId or a counter. Rate-limit reset requests.
- **Regression test:** Two reset requests produce unrelated, high-entropy tokens; a token predicted from the pattern `HM-<id>-<counter>` never validates; a used or expired token is rejected.

---

## Registration & Profile

### P1. Mass assignment on profile update
- **Fix:** Allowlist the updatable fields explicitly (`name`, `phone`, `address`) and copy only those. Privileged fields (role, loyaltyPoints, storeCredit) change only via dedicated, authorised endpoints. Ignore or reject — and log — unexpected parameters.
- **Regression test:** POST `/profile/update` including `loyaltyPoints=999999&role=admin` → afterwards the user's points and role are unchanged; only allowlisted fields moved.

### P2. No password policy
- **Fix:** Enforce a password policy at registration and reset: minimum length ≥ 10, reject passwords on a common/breached list, allow long passphrases. Give clear feedback at entry time.
- **Regression test:** Registering with password `a` (or `password123` from the blocklist) → rejected with a policy message; a compliant passphrase succeeds.

### P3. Stored XSS via profile name
- **Fix:** Output-encode ALL user-controlled fields at every render point — the lab already has `esc()`; the profile greeting must use it too. Add a restrictive Content-Security-Policy as defence in depth.
- **Regression test:** Set the name to `<script>alert(1)</script>` → the profile page source shows `&lt;script&gt;`, the text displays literally, nothing executes.

---

## Product Search

### S1. SQL-injection-style search
- **Fix:** Parameterise queries (prepared statements) so input is data, never query syntax: `... WHERE name LIKE ?` with `%` + escaped term + `%`. In this simulated engine: treat the term purely as a literal substring filter (and escape LIKE wildcards). Never concatenate input into a query string; never echo the built query.
- **Regression test:** Search `' OR '1'='1` → returns only products literally matching (none) — not the full catalogue — and the page shows no query text.

### S2. Reflected XSS in search
- **Fix:** HTML-encode the search term everywhere it is reflected (the results heading included). Validate and length-limit input as a second layer.
- **Regression test:** Search `<script>alert(1)</script>` → the page source contains `&lt;script&gt;` in the results line; no script executes; normal searches still work.

---

## Reviews

### R1. Stored XSS in reviews
- **Fix:** Output-encode all user content at render time (apply `esc()` to review text and author). Add a Content-Security-Policy header as defence in depth. Never store or render raw HTML from users.
- **Regression test:** Post the review `<script>alert(1)</script>` → the product page source contains `&lt;script&gt;`, no script executes, and the text displays literally.

---

## Cart

### C1. Negative-quantity cart bug
- **Fix:** Validate quantities as integers within bounds at every entry point (`1 ≤ qty ≤ stock`, plus a sane per-order cap): `Number.isInteger(qty) && qty > 0`. Recompute line totals from validated quantities; on order placement, decrement stock by the validated quantity only.
- **Regression test:** POST `/cart/add` and `/cart/update` with `qty=-50` and `qty=0` → rejected or clamped per policy; cart total never drops because of a quantity, and stock never increases after an order.

---

## Checkout & Payments

### K1. Price tampering at checkout
- **Fix:** Prices come only from the server-side catalogue at order time. The checkout request carries product IDs and quantities — nothing else monetary. Recompute subtotal server-side; ignore any client-sent price fields.
- **Regression test:** POST checkout with `price_1=0.01` → receipt shows the catalogue price ($6.49). Tampered fields have zero effect on totals.

### K2. Bulk-discount tier manipulation
- **Fix:** Never accept a discount percent from the client. Compute the tier server-side from the actual cart: total units ≥ 50 → 15%, ≥ 25 → 10%, ≥ 10 → 5%, else 0%. The checkout page may *display* the tier; it must not *submit* it.
- **Regression test:** POST checkout for 1 item with `bulkDiscountPercent=90` → receipt shows 0% bulk discount. A 50-unit order → exactly 15%, regardless of submitted fields.

### K3. Coupon stacking + unlimited reuse
- **Fix:** Enforce promotion rules server-side: one coupon per order (or an explicit, capped stacking policy), validate code + expiry + per-customer usage in a redemptions table, and record each redemption so a code cannot be applied twice — including twice in the same request.
- **Regression test:** Checkout with `SAVE10,SAVE10,SAVE10` → discount applied at most once (or the request rejected per policy). Reusing a single-use code on a second order → rejected.

### K4. Overselling — no stock check
- **Fix:** At order placement, check availability and decrement stock atomically (single transaction / locked section): if any line exceeds available stock, reject that line or the order with a clear message. Never let stock go negative.
- **Regression test:** Order 500 units of an 85-stock product → rejected (or capped at 85 per policy) and stock never goes below 0; a within-stock order still succeeds.

---

## Orders & Receipts

### O1 + O2. IDOR on orders & receipts
- **Fix:** Authorise every object access: `if (order.userId !== session.userId && session.role !== 'admin') return 403`. Apply the same check to receipts, and prefer unguessable order references for defence in depth (authorisation is the real fix). Minimise PII on receipts.
- **Regression test:** As Rahim, GET `/orders/1` and `/receipt/1` (Sara's) → 403. GET `/orders/2` and `/receipt/2` (own) → 200. Admin can open all.

---

## Loyalty Programme

### L1. Loyalty redemption without balance check
- **Fix:** Validate on the server, transactionally: `if (points <= 0 || points > user.loyaltyPoints) reject`. Deduct and credit atomically; never let a balance go negative. Apply the same check to points redeemed at checkout.
- **Regression test:** As Rahim (240 pts), POST `/loyalty/redeem` with `points=1000000` → expect 400 and unchanged balance/credit. Redeem exactly 240 → succeeds once; a second redeem of 1 → 400.

### L2. Loyalty transfer without ownership verification
- **Fix:** The source account is ALWAYS the authenticated session user — never a form field. Require the recipient to exist, points > 0 and ≤ sender balance; log the transfer. For high values, require password re-entry or a confirmation step.
- **Regression test:** Logged in as Rahim, submit a transfer naming Sara as source → server ignores/rejects the forged source; Sara's balance unchanged. A legitimate Rahim→Sara transfer of 50 succeeds and is logged.

### L3. CSRF on state-changing actions
- **Fix:** Issue a per-session anti-CSRF token (a real, unguessable one — the lab's static `hx_origin` marker is a detection teaching aid, **not** a fix), embed it in every form, and verify it on every POST. Set session cookies `SameSite=Lax` (or `Strict`) as a second layer. GET requests must never change state.
- **Regression test:** Replay a valid form POST without the token (or from a cross-origin page) → 403 and no state change (balances, profile, stock unchanged). The same POST with the token succeeds.

---

## Supplier Console

### U1. Supplier editing competitors' products
- **Fix:** Scope every supplier query and update by ownership: `WHERE productId = ? AND supplierId = ?`. The console should list only the supplier's own products.
- **Regression test:** As supplier (ID 2), POST an update to a Supplier-9 product → 403/404 and the product is unchanged on the public catalogue. Updating an own product succeeds.

---

## Admin Panel

### M1. Role tampering via session cookie
- **Fix:** Sessions must be unforgeable: store a random session ID in the cookie and keep userId+role server-side, or sign the cookie (HMAC) and verify on every request. The role used for authorisation is read from the server-side record, never from client input.
- **Regression test:** Modify the session cookie's role segment → request is rejected / treated as logged out; `/admin` returns 403 for a genuine customer session.

---

## Platform & Data Exposure

### D1. Unauthenticated customer data API
- **Fix:** Require authentication and authorisation on every API endpoint — an endpoint that serves customer records should be admin-only (or scoped per-customer). Return the minimum fields each consumer needs, and inventory all routes so "leftover" endpoints are found and removed or locked down.
- **Regression test:** GET `/api/customers` without a session → 401/403. With a customer session → 403. With an admin session → only the fields the integration genuinely needs. Endpoint inventory shows no other unauthenticated data routes.

---

## Cross-cutting hardening (defence in depth)
- Hash passwords with a modern KDF (bcrypt/argon2) — the lab stores them in plaintext only as a teaching artefact.
- Add baseline security headers (CSP, X-Content-Type-Options, frame-ancestors) — they blunt, but never replace, the fixes above.
- Log security-relevant events (failed logins, transfers, price/stock changes) with the acting account.

## Retest protocol (per fix)
1. Reproduce the original exploit on the vulnerable build; save the evidence.
2. Apply the fix. Restart the server (shop state resets; delete `progress.json` too if you want the lab system fresh).
3. Run the regression test above — the exploit must now fail in the
   *expected* way (403/400/ignored), not with a 500.
4. Re-run the legitimate workflow (e.g. a normal redemption, a genuine
   50-unit bulk order, an own-product supplier update) — it must still work.
5. Record: date, build, exploit result before/after, regression result,
   and any residual risk. A fix that breaks the business flow is not a fix.
