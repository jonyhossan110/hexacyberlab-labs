# HexaElectro — Fix & Retest Guide

For each flaw: the secure implementation pattern, and a **regression test** that must
fail on this vulnerable build and pass on the fixed build. (Fixes are described, not
applied — this repo stays vulnerable for practice.)

---

## 1. Price Tampering
- **Fix:** Never accept prices from the client. Checkout sends only product ids + quantities;
  the server recomputes every price from its own catalogue inside the order transaction.
- **Regression test:** POST /checkout with `price_8=1` for a $199 item → fixed build charges **$199.00** (tampered field ignored/rejected). Vulnerable build charged $0.90 with coupon.

## 2. Trade-In Value Tampering
- **Fix:** Grade → value mapping lives server-side only (`{A:300,B:180,C:90,D:30}`); the request
  carries device + grade; credit is provisional until the physical device is inspected, and capped
  at the order subtotal.
- **Regression test:** POST /tradein `grade=D&value=5000` → fixed build records **$30** credit.
  Vulnerable build recorded $5,000 and zeroed a $59 order.

## 3. Warranty Claim IDOR
- **Fix:** On claim create, verify `device.ownerId === session.userId` (403 otherwise).
  On claim read, verify `claim.userId === session.userId` or caller is staff. Use unguessable claim ids.
- **Regression test:** As Tanvir, POST claim on `HE100001` → **403**; GET `/warranty/claim/CLM-1001` → **403/404**. Vulnerable build accepted and disclosed it.

## 4. Serial-Number Enumeration
- **Fix:** Require authentication for lookup; return only "registered / under warranty: yes-no"
  for serials you don't own (full detail only to the owner). Use non-sequential, high-entropy
  serials (e.g. `HE-` + 10 random alphanumerics + check digit). Rate-limit lookups.
- **Regression test:** Unauthenticated lookup → **401**; authenticated non-owner lookup returns
  no name/email. Vulnerable build leaked owner + email with no login.

## 5. Warranty End-Date Extension
- **Fix:** Warranty length is a server-side product attribute; the registration request contains
  only the serial. Server computes `warrantyEnd = purchaseDate + product.warrantyMonths`.
- **Regression test:** POST /warranty/register with `warranty_months=1200` → fixed build sets the
  standard term (e.g. +12/+24 months), extra parameter ignored. Vulnerable build set year 2126.

## 6. Role Tampering via Cookie
- **Fix:** Roles come only from the server-side session record. If a role must be in a token,
  use a signed (HMAC) or encrypted cookie / JWT verified server-side on every request.
- **Regression test:** Set cookie `role=admin` as a customer → `/admin` returns **403**.
  Vulnerable build returned 200.

## 7. Stored XSS in Support Tickets
- **Fix:** Context-aware output encoding for *all* user content (the same `esc()` used elsewhere),
  plus a restrictive Content-Security-Policy as defence-in-depth. Sanitise if rich text is required.
- **Regression test:** Ticket body `<script>alert(1)</script>` renders as visible text
  (`&lt;script&gt;…`), no script element in the page. Vulnerable build served it raw.

## 8. Missing Authorization on Admin Pages
- **Fix:** Central authorization middleware: every `/admin/*` route requires role `admin`
  (deny by default). Add route inventory tests so new admin pages inherit the check.
- **Regression test:** As a customer, GET `/admin/inventory` and `/admin/claims` → **403**.
  Vulnerable build returned 200 with full data.

## 9. Excess Data Exposure (Export API)
- **Fix:** Authenticate + authorize (staff only), return the minimum fields, paginate,
  and never include serials/PII in list endpoints. Prefer removing the endpoint.
- **Regression test:** Unauthenticated GET `/api/customers/export` → **401**; customer role → **403**.
  Vulnerable build returned the whole customer list anonymously.

## 10. Coupon Reuse
- **Fix:** Coupon redemption table `(code, userId, orderId, redeemedAt)` with a unique
  constraint per user (or per code for single-use campaigns); check + redeem atomically at checkout.
- **Regression test:** Second order with `ELECTRO10` by the same user → discount **$0** with a
  "coupon already used" notice. Vulnerable build discounted every order.

## 11. CSRF on Profile Change
- **Fix:** Per-session CSRF token in every state-changing form, verified server-side;
  `SameSite=Lax` (or Strict) on the session cookie; Origin/Referer check as a second layer.
- **Regression test:** POST /profile without a valid token (foreign Origin) → **403**, profile
  unchanged. Vulnerable build accepted the cross-site POST and renamed the user.

## 12. Predictable Password-Reset Token
- **Fix:** Token = 32+ random bytes (`crypto.randomBytes`), stored hashed, single-use,
  30-minute expiry, bound to the account; never derived from the user id.
- **Regression test:** `/reset?token=reset-1` → **invalid**; a real requested token works once,
  then fails on reuse; an expired token fails. Vulnerable build's token was literally predictable.

## 13. Unrestricted Invoice Upload
- **Fix:** Allowlist formats (PDF/PNG/JPG), verify magic bytes, cap size, store outside the web
  root, serve via a download endpoint with `Content-Type` from the allowlist +
  `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff`. Never serve user
  content as `text/html` on the shop origin.
- **Regression test:** Upload HTML content → **rejected** (or stored but downloaded as a file,
  never rendered). Vulnerable build served it as `text/html` with scripts intact.

## 14. Flash-Sale Race Condition
- **Fix:** Atomic stock decrement: reserve stock in the same transaction as order creation
  (e.g. conditional `UPDATE … SET stock = stock - q WHERE stock >= q` and check affected rows),
  or a per-product lock / queue for flash sales. Make checkout idempotent per cart.
- **Regression test:** The two-parallel-curl reproduction (PRACTICE-GUIDE A4) → exactly **one**
  order succeeds, the other gets "insufficient stock"; final stock **0**, never negative.
  Vulnerable build created both orders and drove stock to −2.

## 15. SQL Injection Login Bypass
- **Fix:** One authentication path, parameterised: look the user up by email with a
  prepared statement, then compare the password hash. Delete any "legacy" query path.
- **Regression test:** POST /login with `admin@hexaelectro.local' -- ` → **login fails**
  like any wrong password. Vulnerable build created an admin session.

## 16. User Enumeration via Auth Responses
- **Fix:** A single generic message for every login failure and every reset request
  ("If the account exists, we've sent a link"), with uniform response timing.
- **Regression test:** Login + forgot responses for existing vs non-existing emails are
  **byte-identical**. Vulnerable build answered differently for the two cases.

## 17. Brute Force — No Rate Limiting
- **Fix:** Per-account + per-IP throttling (e.g. exponential backoff after 5 failures,
  temporary lockout / CAPTCHA), plus alerting on bursts.
- **Regression test:** The 10th rapid failed login is **delayed or refused (429/lockout)**,
  while a correct login after the cool-down still works. Vulnerable build processed all 10 instantly.

## 18. Default Administrator Credentials
- **Fix:** No shipped defaults: the installer forces a unique strong admin password on
  first run; seeded/demo accounts are absent from production builds.
- **Regression test:** Login as admin with the documented default password → **fails**.
  Vulnerable build succeeded.

## 19. Weak Password Policy at Registration
- **Fix:** Enforce minimum length (12+) and screen against common/breached passwords at
  registration and password reset.
- **Regression test:** Register with password `a` → **rejected with a policy message**.
  Vulnerable build created the account.

## 20. Stored XSS via Display Name
- **Fix:** Encode the display name (and every user-controlled string) at every render
  point, navigation included — same `esc()` discipline as the rest of the app.
- **Regression test:** Name set to `<script>alert(1)</script>` renders as inert text in
  the header on all pages. Vulnerable build served it raw.

## 21. Mass Assignment on Profile Update
- **Fix:** Allow-list updatable fields server-side (`name`, `address`, `email` only);
  role and credit fields change only through privileged, audited flows.
- **Regression test:** POST /profile with `role=admin` (or `tradeInCredit=9999`) →
  **fields ignored**; the account's role/credit are unchanged. Vulnerable build applied both.

## 22. SQL Injection in Product Search
- **Fix:** Parameterise the search query; treat the term as data. Never echo the built
  query to the client.
- **Regression test:** Search `' OR '1'='1` returns only products literally matching the
  term (normally none). Vulnerable build returned the whole catalogue.

## 23. Reflected XSS in Search
- **Fix:** HTML-encode the reflected term and any diagnostic output; add a CSP.
- **Regression test:** Search `<script>alert(1)</script>` → the page shows it as text
  (`&lt;script&gt;…`). Vulnerable build reflected it raw.

## 24. Negative Quantity Tampering
- **Fix:** Server-side quantity validation on add-to-cart and again at checkout:
  integer, `1 ≤ qty ≤ stock`; reject anything else.
- **Regression test:** POST /cart/add with `qty=-2` → **rejected** (or clamped with an
  error and no negative line in the cart). Vulnerable build accepted it and reduced the total.

## 25. Order IDOR
- **Fix:** Ownership check on every order read: `order.userId === session.userId`
  (or staff role), else 404. Consider unguessable order references as defence in depth.
- **Regression test:** As Tanvir, GET `/order/5001` → **403/404**. Vulnerable build
  served Nadia's full order with serials.

## 26. Serial Lookup Owner-PII Exposure
- **Fix:** Authenticate the lookup; non-owners get only "registered / in warranty:
  yes–no". Owner-identifying fields are returned only to the owner or staff.
- **Regression test:** Unauthenticated lookup of `HE100001` → **401**, and no response
  variant contains a name or email for non-owners. Vulnerable build returned both anonymously.

## 27. Invoice IDOR
- **Fix:** Require login + ownership before serving an invoice; reference files by
  unguessable ids; serve as downloads (see #13).
- **Regression test:** GET `/invoice/1` as another user or anonymously → **401/403/404**.
  Vulnerable build served the document to anyone.

---

### Retest discipline
1. Reproduce on the vulnerable build first (evidence before the fix).
2. Apply one fix at a time; rerun that flaw's regression test **and** its neighbours
   (e.g. fixing #6 changes how #8's gate behaves — retest both).
3. Rerun the combination chains in `VULNERABILITIES.md` — a chain is closed only when
   every link fails.
