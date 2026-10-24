# HexaLuxury — Fix & Retest

For every one of the **23 tests**: the **secure implementation** pattern, a
**regression test** (run against a fixed build with `curl`; Lena =
`lena@hexaluxury.local` / `User@123`), and the **remediation** idea in one
line. Numbering matches `VULNERABILITIES.md`. Fixes are described against
this codebase's structure (single `server.js`, cookie session, in-memory
store).

---

## Login & Authentication

### A1. SQL Injection Login Bypass
- **Secure implementation:** Parameterised queries / prepared statements for
  the login lookup (and everywhere). User input is bound as data, never
  concatenated into query text; the simulated string-query layer is removed.
- **Regression test:** `POST /login` with email `' OR '1'='1' -- ` → **401**;
  the real credentials for that account still log in.
- **Remediation:** Injection dies when input can never become query structure.

### A2. No Brute-Force Protection on Login
- **Secure implementation:** Per-account + per-IP throttling with progressive
  delays, temporary lockout after N failures, CAPTCHA step-up, and alerting
  on attack patterns, enforced server-side.
- **Regression test:** 10 rapid failed logins for one account → responses
  slow, lock, or challenge (not 10 identical instant 401s); a correct login
  after the cool-down still works.
- **Remediation:** Guessing must cost the attacker time, not the business accounts.

### A3. Account Enumeration via Password Reset
- **Secure implementation:** One identical generic response for every
  `/forgot` submission ("If the account exists, a link is on its way"),
  constant response shape/timing for existing and non-existing emails.
- **Regression test:** `/forgot` for a real and an invented email → **same
  status, same text**; only the real inbox receives a link.
- **Remediation:** Never let a public form confirm who your customers are.

### A4. Predictable Password-Reset Token
- **Secure implementation:** Token = ≥128 bits from a CSPRNG, stored hashed,
  single-use, expiring in ≤30 minutes, bound to the account; the link is only
  ever sent to the account email (the lab's "shortcut display" is removed).
- **Regression test:** `rst-1-<today>` and any computed guess → **invalid**;
  a real emailed token works once, then fails on reuse.
- **Remediation:** Reset tokens are bearer credentials — generate and store
  them like passwords.

### A5. Role Tampering via Cookie
- **Secure implementation:** Session cookie carries only an **opaque,
  server-side session id** (or a signed/encrypted token). Role and tier are
  read from the server-side user record on every request.
- **Regression test:** Edit the cookie's role to `admin` → `/admin` returns
  **403** (or the session is rejected); normal login still works.
- **Remediation:** Never trust client-stored claims about identity or privilege.

### A6. No Password Policy at Registration
- **Secure implementation:** Server-side policy at registration and reset:
  minimum length (≥10–12), screening against known-breached passwords, and
  clear feedback. Policy is enforced where the account is created, not in
  the form.
- **Regression test:** Register with password `ab` → **rejected** with a
  policy message; a compliant password registers fine.
- **Remediation:** Weak passwords are a server decision, not a user preference.

## Search & Catalogue

### S1. SQL Injection in Product Search
- **Secure implementation:** Same parameterisation as A1; the search filter
  binds the term as a value (or uses a safe in-memory match). Result filters
  (VIP visibility) are applied server-side after the query, on every path.
- **Regression test:** Search `' OR '1'='1` as Lena → returns only pieces
  matching the literal term (none) and **no Private Sale pieces**; normal
  search still works.
- **Remediation:** One data-access discipline, applied to every query, kills
  the whole injection class.

### S2. Reflected XSS in Search
- **Secure implementation:** Contextual output encoding of the reflected term
  (HTML-escape in body context, attribute-escape in attributes) plus a
  restrictive `Content-Security-Policy` as defence in depth.
- **Regression test:** Search `<script>alert(1)</script>` → the term appears
  as inert text in the page source (`&lt;script&gt;`); legitimate searches
  render normally.
- **Remediation:** Encode on output, for the context the data lands in.

### S3. Private-Sale Broken Access Control
- **Secure implementation:** Authorise on the server for every VIP object:
  product page, add-to-cart and checkout all check
  `product.vipOnly → user.tier in (Gold, Platinum)` and return 403 otherwise.
- **Regression test:** As Lena, `GET /product/4` → **403**; `POST /cart/add`
  for product 4 → rejected, cart stays empty.
- **Remediation:** Hiding UI is not access control; enforce on every route
  that touches the object.

## VIP Membership

### V1. VIP Tier Bypass via Mass Assignment
- **Secure implementation:** Whitelist updatable fields server-side
  (`name`, `email`, `phone` only). Tier and role are writable *only* by admin
  code paths, never from request bodies. Ignore/reject unexpected fields.
- **Regression test:** Login as Lena, `POST /profile` with `tier=Platinum`;
  reload `/account` → tier must still read **Member**.
- **Remediation:** Mass assignment dies when the server binds only the fields
  the user is allowed to own.

### V2. Tier-Price Manipulation
- **Secure implementation:** Discount is computed server-side from the user's
  stored tier at checkout (`TIER_DISCOUNT[user.tier]`); the field is removed
  from the form entirely. Combined with C1's server-side pricing, the client
  sends only ids + quantities.
- **Regression test:** Submit checkout with `tierDiscount=95` as Lena → total
  reflects **0%** tier discount; as Arif (Platinum) the real 10% applies.
- **Remediation:** Entitlements come from server-side records, never from the
  buyer's own form.

## Cart & Checkout

### C1. Price Tampering at Checkout
- **Secure implementation:** The server recomputes prices from its own
  catalogue at checkout; request bodies carry only product ids + quantities.
  Any client-sent price is ignored.
- **Regression test:** Submit checkout with `price_0=1` → order total must
  equal the catalogue price (less legitimate discounts only).
- **Remediation:** Money values are server facts, never request parameters.

### C2. Checkout Line Forgery
- **Secure implementation:** Build the order exclusively from the
  server-side cart: the client submits nothing but "place order" (plus
  coupon/payment choices). Product ids, quantities and prices all come from
  server state validated at order time.
- **Regression test:** Cart 1 × product 9, submit checkout with `qty_0=5` (or
  a foreign `pid`) → the order still contains exactly **1 × product 9** (the
  forged fields are ignored).
- **Remediation:** Never let the request restate what the server already knows.

### C3. Coupon Reuse Without Limit
- **Secure implementation:** Redemption ledger: each code has per-user and
  global usage limits, an expiry, and single-use flags enforced in a
  transaction at checkout; record `couponId + userId` on the order.
- **Regression test:** Redeem `LUXE10` twice as Lena → second order shows
  **no coupon discount** and a "already used" message.
- **Remediation:** A discount is a stateful entitlement, not a magic word.

## Orders & Certificates

### O1. Order IDOR
- **Secure implementation:** Ownership check on every order read:
  `order.userId === user.id || user.role === 'admin'`, else 404 (404
  preferred — it doesn't confirm the order exists).
- **Regression test:** As Lena, `GET /order/1` → **404**; her own order opens;
  admin can open any order.
- **Remediation:** Authorise the object, not just the route.

### O2. Certificate IDOR
- **Secure implementation:** Ownership check on every certificate read:
  `cert.ownerId === user.id || user.role === 'admin'`, else 404/403.
- **Regression test:** As Lena, `GET /certificate/<another customer's>` →
  **403/404**; her own purchased certificate still opens.
- **Remediation:** Object-level authorisation on every id-addressed route.

### O3. Certificate Forgery
- **Secure implementation:** Serials must be **unpredictable** (e.g.
  `HLX-` + 128-bit random, or a keyed HMAC/check digit) and the verifier must
  check **existence in the registry + status** — never format alone.
  Rate-limit verification attempts.
- **Regression test:** `GET /verify?cert=HLX-1742` (never issued) → must say
  **not recognised**; a genuinely issued serial still verifies.
- **Remediation:** A certificate system is a registry lookup over unguessable
  identifiers, not a pattern match.

### O4. Certificate Registry Enumeration
- **Secure implementation:** Unguessable serials (O3) remove the value;
  additionally rate-limit and monitor `/verify` per IP/session, alert on
  probing patterns, and consider requiring authentication for owner details.
- **Regression test:** 20 rapid distinct serial probes → throttled/blocked
  responses; a single legitimate verification still succeeds instantly.
- **Remediation:** An unlimited public oracle over sequential ids is a data
  export feature — close both halves.

## Profile & Settings

### P1. CSRF on Profile Change
- **Secure implementation:** Per-session anti-CSRF token embedded in every
  state-changing form and verified on POST; `SameSite=Lax` (or `Strict`) on
  the session cookie as a second layer.
- **Regression test:** POST `/profile` without the token (replay a captured
  request minus the field) → **403**, profile unchanged; normal form still
  saves.
- **Remediation:** State changes require a token the attacker's site cannot
  read.

### P2. Unrestricted File Upload
- **Secure implementation:** Allowlist extensions/MIME (`jpg/png` only),
  verify magic bytes, re-encode images server-side, store under random
  names, serve from a separate path/domain with `Content-Disposition` and
  `X-Content-Type-Options: nosniff`. Never serve uploads as HTML.
- **Regression test:** Upload `x.html` → rejected (or stored but served as
  `application/octet-stream` with a non-executable name); a real PNG still
  works.
- **Remediation:** Treat every upload as hostile until type, content and
  serving context are all pinned down.

## Concierge

### M1. Stored XSS in Concierge Messages
- **Secure implementation:** Output-encode **all** user content at render
  time (the `esc()` helper used everywhere else), in every context —
  including admin views. Add a restrictive `Content-Security-Policy` as
  defence in depth.
- **Regression test:** Post `<script>alert(1)</script>` to the concierge; open
  `/admin/inbox` as admin → the payload appears as inert text, no execution.
- **Remediation:** Admin screens are the highest-value XSS target; encode
  there first.

## Admin Panel

### D1. CSRF on Admin Action (State-Changing GET)
- **Secure implementation:** Deletions (and every state change) are
  **POST-only**, carry a per-session anti-CSRF token, and ask for
  confirmation. GET endpoints are read-only by design and by test.
- **Regression test:** `GET /admin/inbox/delete?id=1` (even as admin) →
  **405/no state change**, message still present; the inbox's POST delete
  with token works.
- **Remediation:** If a URL can change state, anything that can make a
  browser load a URL can fire it.

## Platform & Data

### X1. Excess Data Exposure — `/api/members`
- **Secure implementation:** Require authentication + admin role; return only
  the fields the caller needs (no phone, no spend for non-admins). Better:
  remove the endpoint if no feature uses it.
- **Regression test:** Unauthenticated `GET /api/members` → **401/403**;
  as Lena → **403**; as admin → works.
- **Remediation:** Every endpoint gets an auth decision and a
  data-minimisation pass.
