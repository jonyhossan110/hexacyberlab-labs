# HexaFashion — Fix & Retest Guide

For every vulnerability: the **secure implementation**, a **regression test** that proves the fix (run it after patching — it must fail to exploit), and a short **remediation note**. Tests assume the lab runs at `http://127.0.0.1:3010` and use the seed accounts. `$CJ` is a cookie jar logged in as Aisha:

```bash
curl -s -c /tmp/cj.txt -X POST http://127.0.0.1:3010/login \
  --data 'email=aisha@hexafashion.local&password=User@123'
```

---

## 1. Price Tampering at Checkout

- **Secure implementation:** Never accept prices from the client. The checkout request should carry only `productId`, `size`, `qty`; the server loads the catalogue price itself:
  ```js
  const prod = findProduct(pids[i]);
  const unit = prod.price + (size === 'XL' ? prod.xlSurcharge : 0);
  ```
- **Regression test:** Add the jacket to a cart, then POST `/checkout` with `price=0.01`. **Pass:** the created order's total is the real catalogue total ($199.99 + surcharge), and the tampered field is ignored entirely.
- **Remediation:** Money values are server-side facts. Any price the client sends is display data only.

## 2. Size-Variant Surcharge Manipulation

- **Secure implementation:** Compute the variant adjustment from server-side product data keyed by the requested size (same code path as Fix #1). Reject unknown sizes; never parse a client-sent `surcharge`.
- **Regression test:** POST `/checkout` for an XL item with `surcharge=-50`. **Pass:** the charged surcharge equals the catalogue XL surcharge (e.g. +$8.00) and the total is ≥ the base price.
- **Remediation:** Variant pricing is part of the product record, not of the request. One server-side pricing function for cart, checkout and invoices prevents drift.

## 3. IDOR on Orders / Invoice

- **Secure implementation:** Authorise every object access:
  ```js
  if (order.userId !== currentUser.id && !isAdmin) return 404; // or 403
  ```
  Apply the same check to the invoice route. Prefer 404 so IDs can't be probed for existence.
- **Regression test:** As Aisha, `curl -b /tmp/cj.txt http://127.0.0.1:3010/orders/1002` and `/orders/1002/invoice`. **Pass:** both return 403/404 and contain none of Karim's data; `/orders/1001` still works.
- **Remediation:** "Logged in" is authentication, not authorisation. Every object lookup must be scoped to the owner (or an admin).

## 4. IDOR on Returns (View / Approve)

- **Secure implementation:** Listing shows only the requester's own returns (admins see all). Detail view enforces ownership. Approve/reject require the **admin role checked server-side**:
  ```js
  if (!isAdminUser) return 403;
  ```
- **Regression test:** As Aisha, GET `/returns/501` → 403/404; POST `/returns/501/approve` → 403 and the return's status stays `Pending`. As admin, approve still works.
- **Remediation:** Workflow actions that move money are privileged operations; hiding the button in the UI is not a control.

## 5. Refund-Amount Tampering

- **Secure implementation:** The refund amount is derived server-side from the order: `refund = sum(charged price of returned items)`. The request accepts only `orderId` + `reason` (+ item selection); any client-sent amount is ignored. Cap refunds at the amount actually paid, cumulatively per order.
- **Regression test:** Create a return for order #1001 with `refundAmount=9999`. **Pass:** the stored return's refund equals the order total ($79.97) and approval never issues more.
- **Remediation:** Financial outputs must be computed from financial records, never echoed from user input.

## 6. Role Tampering via Cookie

- **Secure implementation:** Keep session state **server-side**: the cookie holds only an opaque, random session ID (`crypto.randomBytes(32)`); role is read from the server-side session/user record on every request. If a client token must carry claims, sign it (HMAC) and verify the signature.
- **Regression test:** Log in as Aisha, decode the cookie — it must be an opaque ID with no editable role. Hand-craft a cookie claiming admin. **Pass:** `/admin` returns 403 in both cases; tampering invalidates the session.
- **Remediation:** Anything the client can edit, the client controls. Trust boundaries belong on the server.

## 7. Mass Assignment on Profile Update

- **Secure implementation:** Whitelist assignable fields explicitly:
  ```js
  for (const k of ['name', 'phone', 'address']) if (body[k] !== undefined) user[k] = String(body[k]);
  ```
  Privileged fields (`role`, `isAdmin`, `loyaltyTier`) change only through separate, authorised admin endpoints.
- **Regression test:** POST `/profile` with `isAdmin=true&loyaltyTier=PLATINUM&role=admin`. **Pass:** profile still shows `Admin flag: false`, tier unchanged; `/admin` stays 403.
- **Remediation:** ORMs and `Object.assign(user, req.body)` patterns copy attacker fields by default — always whitelist.

## 8. Stored XSS in Reviews

- **Secure implementation:** HTML-encode all user content on output (`esc()`), exactly as the author name already is. Add a Content-Security-Policy header as defence in depth. Store the raw text; encode at render time.
- **Regression test:** Post the review `<script>alert(1)</script>`. **Pass:** the product page source contains `&lt;script&gt;` (inert text) and no alert fires for a second user.
- **Remediation:** Output encoding at every render point; a single unescaped field is enough for full stored XSS.

## 9. SQL-Injection-Style Search

- **Secure implementation:** Use parameterised queries / bound parameters in a real database; in this in-memory lab, treat input strictly as data — a literal substring match — and always enforce the `hidden = 0` filter in code, never via string-built conditions. Never let input alter query structure, and never return internal fields (`costPrice`) or other tables.
- **Regression test:** Search `' OR '1'='1` and `' UNION SELECT ...`. **Pass:** zero results (no product name literally contains that text), hidden products never appear, and no user data is ever rendered.
- **Remediation:** Injection = data becoming code. Parameterisation keeps the two permanently separate.

## 10. CSRF on Profile Change

- **Secure implementation:** Issue a per-session anti-CSRF token, embed it in every state-changing form, and verify it on POST. Set the session cookie `SameSite=Lax` (or `Strict`) and check `Origin`/`Referer` as defence in depth.
- **Regression test:** Replay the malicious auto-submit page against a logged-in victim session without a token. **Pass:** the POST is rejected (403) and the address is unchanged; the legitimate form (with token) still saves.
- **Remediation:** Browsers send cookies automatically — servers must prove a request was intentional.

## 11. Predictable Password-Reset Token

- **Secure implementation:** Generate the token with a CSPRNG (`crypto.randomBytes(32).toString('hex')`), store only its hash, set a short expiry (≤ 30 min), make it single-use, and invalidate all existing sessions on reset.
- **Regression test:** Trigger resets for two accounts. **Pass:** tokens are long random hex with no derivable relationship to email/ID; the offline-computed `base64(email).id` token is rejected on `/reset`.
- **Remediation:** A reset token is a temporary password — it needs password-grade entropy and lifetime limits.

## 12. Unrestricted Avatar Upload

- **Secure implementation:** Allow-list image types (`.png/.jpg/.gif`), verify content by magic bytes and re-encode the image server-side, store under a random filename outside any executable path, and serve from a separate static context with `Content-Disposition`/strict content types (never `text/html` or `image/svg+xml` for user files; drop SVG or sanitise it).
- **Regression test:** Upload `avatar.html` and `x.svg` with a script payload. **Pass:** both are rejected (400) or stored inertly; requesting the stored file never returns `text/html` and no script executes.
- **Remediation:** Uploads are hostile input with a filename. Type is proven from content, never from extensions the attacker chose.

## 13. Coupon Stacking / Unlimited Reuse

- **Secure implementation:** Business rules in code: each code usable **once per customer** (usage table keyed by code+user), at most **one** coupon per order (or an explicit, capped stacking policy), codes expire, and the discount is computed from the server-side coupon record.
- **Regression test:** Checkout with `VIP50,VIP50,VIP50`. **Pass:** discount applied once (50%), total $99.99 for the jacket; a second order with `VIP50` by the same user gets no discount.
- **Remediation:** Promotions are financial policy — enforce them like payments, with a ledger of who used what, when.

## 14. Gift-Card Enumeration

- **Secure implementation:** Use long random codes (e.g. 16 chars from a large alphabet), require login to check a balance, return balance only for cards the user owns/redeems, and rate-limit + lock out repeated checks (e.g. 5 attempts/min per IP/account with exponential backoff and alerting).
- **Regression test:** Script 20 rapid checks across `HF-1000…HF-1009` and random codes. **Pass:** responses become generic ("invalid or unavailable"), requests are throttled (429) after the limit, and balances of unowned cards are never disclosed.
- **Remediation:** A balance oracle plus sequential IDs is a cash machine. Unguessable identifiers and throttling remove both halves of the attack.

## 15. SQL Injection Login Bypass

- **Secure implementation:** Authenticate with a parameterised query (or, in this in-memory lab, a strict data-only comparison of the submitted email against stored records). The submitted value must never be interpreted as query logic — tautologies, comments and UNION fragments are just (non-matching) strings.
- **Regression test:** POST `/login` with email `admin@hexafashion.local' OR '1'='1'` and any password. **Pass:** 401 with the generic failure message; no session cookie is issued; the real admin password still logs in normally.
- **Remediation:** Injection = data becoming code. Parameterisation keeps the two permanently separate, on the login form most of all.

## 16. No Brute-Force Protection on Login

- **Secure implementation:** Track failed logins per account and per IP; after a small threshold (e.g. 5), apply progressive delays and a temporary lockout (e.g. 15 minutes), log and alert on bursts, and consider MFA for admin accounts. Failures during lockout return the same generic message.
- **Regression test:** Script 10 wrong-password attempts against one account. **Pass:** attempts are delayed/rejected (429/403 or lockout message) well before the 10th, and the account cannot be logged into until the lockout expires — while a correct-password login after expiry still works.
- **Remediation:** Passwords are only as strong as the cost of guessing them. Throttling raises that cost from ~zero to impractical.

## 17. Account Enumeration via Login & Reset Responses

- **Secure implementation:** One generic message for every authentication outcome: login always answers "Invalid email or password", and reset always answers "If an account exists for that email, a reset link has been sent" — identical in wording, status code and timing for existing and non-existing addresses.
- **Regression test:** Compare responses for `aisha@hexafashion.local` (wrong password) vs `ghost@nowhere.local` on both `/login` and `/forgot`. **Pass:** the response bodies and status codes are indistinguishable in all four cases.
- **Remediation:** Error messages are an API. If they differ by account existence, they are an account-existence oracle.

## 18. Weak Password Policy at Registration

- **Secure implementation:** Enforce a minimum length (12 characters recommended) plus a check against common/breached-password lists at registration, password change and reset. Reject anything weaker with a clear message.
- **Regression test:** Register with password `a` (and with `password123`). **Pass:** both rejected with a policy message; a strong unique password registers successfully.
- **Remediation:** The site chooses the floor for account security — users cannot be relied on to choose it themselves.

## 19. Reflected XSS in Search Results

- **Secure implementation:** HTML-encode every reflected value on output — including "harmless" summary lines like the result count — and add a restrictive Content-Security-Policy as defence in depth.
- **Regression test:** Search for `<script>alert(1)</script>`. **Pass:** the page source shows the payload encoded (`&lt;script&gt;`) everywhere it appears, and no script executes.
- **Remediation:** Reflection points hide in echoes, summaries and error messages — encode at every render point, not just the obvious ones.

## 20. Negative Quantity at Checkout

- **Secure implementation:** Validate quantities server-side as integers in a sane range (1 … available stock) before any pricing maths; reject the whole order on invalid input.
- **Regression test:** POST `/checkout` with `qty=-2`. **Pass:** the order is rejected (400) and no order record is created; a normal quantity still checks out.
- **Remediation:** Client-side `min=1` is a hint to honest users, not a control. All money-adjacent input needs server-side validation.

## 21. Overselling Beyond Stock

- **Secure implementation:** Check availability server-side at order time and decrement stock in the same operation that creates the order (transaction/lock), so concurrent checkouts cannot both pass against the same units.
- **Regression test:** POST `/checkout` for 999 units of a size with 4 in stock. **Pass:** the order is rejected or capped with a clear out-of-stock response, and the recorded stock never goes negative; a within-stock order succeeds and reduces stock by exactly its quantity.
- **Remediation:** Inventory is an invariant, not a display value. Enforce it where the order is created, atomically.

## 22. Stored XSS via Customer Name in the Admin Panel

- **Secure implementation:** Apply the same output encoding used everywhere else to **admin views too** — customer names are attacker-controlled data. Add CSP as a second layer; never render user fields raw "because it's internal".
- **Regression test:** Set a profile name to `<script>alert(1)</script>`, then open `/admin/customers` as admin. **Pass:** the name appears as inert text (`&lt;script&gt;…`) and no script executes in the admin's session.
- **Remediation:** Back-office tooling is the highest-value XSS target in the building. Encoding discipline must be universal, not per-page.

## 23. Path Traversal in File Download

- **Secure implementation:** Resolve the requested path (`path.resolve`) and require the result to stay inside the single allowed directory/file set; better, address downloads by an opaque ID mapped server-side to a file, never by client-supplied paths. Reject `..`, absolute paths and anything outside the allow-list.
- **Regression test:** `GET /download?name=server.js`, `GET /download?name=../progress.json`, `GET /download?name=/etc/passwd`. **Pass:** all three return 404/403 with no file content; `GET /download?name=logo.png` still serves the logo.
- **Remediation:** A filename from a request is a path an attacker draws. Confine it, or don't accept it at all.

## 24. Unauthenticated Customer Data Exposure API

- **Secure implementation:** Require authentication (and an admin authorisation check) on the export endpoint, return the minimum fields a consumer actually needs, and **never serialise password material** — store passwords hashed (bcrypt/argon2) so there is nothing worth returning. Remove debug/export surfaces from production builds entirely.
- **Regression test:** `curl http://127.0.0.1:3010/api/users` with no cookies. **Pass:** 401/403; with a customer session: still 403; with an admin session: only the minimal, password-free field set.
- **Remediation:** Every endpoint needs an explicit access decision. "Nobody knows the URL" is not one.

---

## Retest protocol (for the whole lab)

1. Apply the fixes in a **copy** of the lab (keep the vulnerable original intact for training).
2. Run all 24 regression tests above and the PRACTICE-GUIDE challenges against the fixed copy — every exploit must now fail while legitimate flows (login, buy, return, admin approve) still work.
3. Record results per finding: *Fixed / Partially fixed / Not fixed*, the test evidence, and the date — the same Fix & Retest discipline used for client reports.
