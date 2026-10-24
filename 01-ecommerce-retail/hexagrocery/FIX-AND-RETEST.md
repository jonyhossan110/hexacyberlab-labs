# HexaGrocery — Fix & Retest (22 flaws)

For each flaw: the secure implementation pattern, a regression test that must now FAIL the exploit, and why the fix works. Snippets are illustrative (same route names as `server.js`). Entries 1–14 are the original set; 15–22 cover the flaws added in the Lab-6 system rebuild (SQLi login, brute force, enumeration, profile XSS, weak passwords, reflected XSS, quantity tampering, data exposure).

---

### 1. Slot capacity bypass
- **Fix:** Enforce capacity on the server, atomically, at booking time: reject when full (HTTP 409). Never treat a disabled UI option as a control.
  `if (slot.booked >= slot.capacity) return 409;`
- **Regression test:** Direct POST with `slotId=3` (full) → expect 409, no order created, `booked` unchanged.
- **Why:** The invariant ("never exceed capacity") now lives where the state changes, not where the HTML is drawn.

### 2. Substitution price-difference flaw
- **Fix:** The server prices the substitute from the product table (`sub.price`), computes the difference against the original line, and shows the customer the delta for approval before charging. Ignore any client-supplied `price`.
- **Regression test:** Picker proposes salmon with `price=6.40` in the body → order charges $12.50 (or waits for customer approval); total changes by exactly the real difference.
- **Why:** Prices are server-side facts; the request may name *which* product, never *what it costs*.

### 3. Negative delivery fee
- **Fix:** Compute the fee server-side from a fee table (by slot/zone/basket size). If a fee must be accepted from the client during a transition, validate `fee >= 0` and clamp to the tariff.
- **Regression test:** Checkout with `deliveryFee=-50` → fee applied is the tariff value (or 422); total never drops because of the fee.
- **Why:** A fee is a business rule, not user input.

### 4. Price tampering at checkout
- **Fix:** Remove price fields from the form; at checkout, reload each product's price from the catalogue and bill that. Log and alert on any submitted price mismatch during migration.
- **Regression test:** POST with `price_8=0.01` → order bills salmon at $12.50.
- **Why:** Same principle as #2: the client transmits identifiers and quantities only.

### 5. IDOR on order view
- **Fix:** Authorize every object access: `if (order.userId !== u.id && role !== 'admin' && role !== 'picker') return 404;` (404, not 403, to avoid confirming existence). Scope queries by owner (`WHERE userId = ?`).
- **Regression test:** As Ela, GET Monir's order → 404; address/phone never rendered.
- **Why:** Authentication says who you are; authorization must be re-checked per object.

### 6. IDOR on address edit
- **Fix:** Same ownership check on `GET/POST /addresses/:id/edit`; load addresses through an owner-scoped lookup.
- **Regression test:** As Ela, POST `/addresses/1/edit` → 404 and Monir's address is byte-identical afterwards.
- **Why:** Unpredictable ids are not a fix — the check is.

### 7. Stored XSS in delivery note
- **Fix:** Output-encode at render time everywhere the note appears (order page, picker desk, admin). Store the raw text; encode on display. Add a restrictive CSP as defence in depth.
- **Regression test:** Note `<script>alert(1)</script>` renders as visible text in all three views; no script executes.
- **Why:** Encoding at the sink protects every current and future view of the stored data.

### 8. Role cookie tampering
- **Fix:** Never trust a client-held role. Keep role server-side in the session record; or, if a token must travel, sign it (HMAC) and verify on every request. Regenerate the session id at login.
- **Regression test:** Set `role=admin` cookie as a customer → `/admin` returns 403; tampered cookies are ignored.
- **Why:** Integrity of authorization data must not depend on the party being authorized.

### 9. Coupon stacking / unlimited reuse
- **Fix:** Business rules server-side: one coupon per order (or an explicit allow-list of combinable codes), per-user redemption records checked transactionally, minimum-basket rules, campaign end dates.
- **Regression test:** `coupon=FRESH10,GROCERY20,WELCOME15,FRESH10` → only the permitted single discount applies; a second order with the same code is refused if the campaign is once-per-user.
- **Why:** Promotions are money; their rules deserve the same rigour as payment code.

### 10. CSRF
- **Fix:** Per-session synchronizer tokens on every state-changing form + `SameSite=Lax` (or `Strict`) on the session cookie; verify `Origin`/`Referer` as a second layer.
- **Regression test:** The A4 attack page's auto-submitted form → 403, profile unchanged.
- **Why:** The browser will happily send the victim's cookies cross-site; the token proves the request came from your own form.

### 11. Predictable reset token
- **Fix:** Token = ≥128 bits from a CSPRNG (`crypto.randomBytes(32).toString('hex')`), stored hashed, single-use, expiring in ≤30 minutes, bound to the account; rate-limit attempts.
- **Regression test:** Tokens for two requests share no derivable pattern; yesterday's format guess (`rst-1-<minute>`) → 400; a used token cannot be replayed.
- **Why:** A reset token is a temporary password — it must be at least as unguessable as one.

### 12. Mass assignment (walletBalance)
- **Fix:** Allow-list updatable fields (`name`, `phone`) and build the update explicitly; never assign request bodies onto records. Privileged fields (`walletBalance`, `role`) change only through dedicated, authorized flows with audit logs.
- **Regression test:** POST profile with `walletBalance=100000&role=admin` → both unchanged; only allow-listed fields update.
- **Why:** Every extra key in the body is a field the attacker gets to write unless you say otherwise.

### 13. Slot race (check-then-act)
- **Fix:** Make reservation atomic: increment with a guard in one operation (`UPDATE slots SET booked = booked + 1 WHERE id = ? AND booked < capacity`, check affected rows), or serialize with a per-slot lock / queue. Re-validate at commit time, not only at read time.
- **Regression test:** The parallel-curl reproduction (5–10 concurrent checkouts against a 1-seat-left slot) → exactly one succeeds, the rest get 409; `booked` never exceeds capacity.
- **Why:** Correctness under concurrency cannot come from a check that happens before an await — the check and the act must be indivisible.

### 14. Search injection
- **Fix:** Parameterised queries in a real stack (`WHERE name LIKE ?` with the term as a bound parameter). In this lab's in-memory port: treat the term as an opaque literal (strip/escape nothing — simply never interpret it), which the fixed build does by matching on the raw string only.
- **Regression test:** `q=' OR '1'='1` returns only products literally containing that string (normally zero) instead of the whole catalogue.
- **Why:** Injection dies when data and code travel in separate channels; the user input must never become query syntax.

### 15. SQL injection — login bypass *(new)*
- **Fix:** Parameterised queries in a real stack (`WHERE email = ? AND password_hash = ?` with bound parameters and a password hash comparison in code). In this lab's in-memory port: match credentials as opaque literals only — never interpret quote logic in the input.
- **Regression test:** Login with email `' OR '1'='1' -- ` and any password → 401 generic failure; the same input as a *stored* value can still be found literally. Normal logins unaffected.
- **Why:** Same principle as #14: when data and code travel in separate channels, input cannot rewrite the query — including at the front door.

### 16. Brute force — no login rate limiting *(new)*
- **Fix:** Per-account and per-IP throttling: progressive delays after a few failures, temporary lockout (e.g. 15 min after 10 failures), optional CAPTCHA, and alerting on failure spikes.
- **Regression test:** 10 rapid wrong passwords for one account → subsequent attempts are delayed/locked (429/423) even with the CORRECT password during the lock window; other accounts unaffected.
- **Why:** Guessing must become slow, noisy and finite; unlimited silent attempts make every weak password a timed takeover.

### 17. User enumeration via error messages *(new)*
- **Fix:** One generic response for all authentication outcomes: login always "Invalid credentials"; forgot-password always "If that email exists, a reset link was sent" — identical status, body and timing for existing and non-existing accounts.
- **Regression test:** Probe both endpoints with an existing and an invented email → byte-identical responses (modulo nothing); the A3 enumeration evidence can no longer be produced.
- **Why:** Differences in wording are an oracle; removing the oracle removes the free target list.

### 18. Stored XSS in display name *(new)*
- **Fix:** Output-encode the display name at every render sink (profile greeting included); validate length/character set at input as a second layer; CSP as defence in depth.
- **Regression test:** Set the name to `<script>alert(1)</script>` → it renders as visible text on `/profile`; no script executes for any viewer.
- **Why:** Same sink-encoding principle as #7, applied to identity fields that follow the user around the UI.

### 19. Weak password policy at registration *(new)*
- **Fix:** Enforce a minimum length (≥10) and screen new passwords against known-breached lists; give live feedback on the form.
- **Regression test:** Register with password `a` → rejected with a policy message; a compliant password registers normally.
- **Why:** Policy at the door is the cheapest control in the whole auth stack — it removes the weakest accounts attackers harvest first.

### 20. Reflected XSS in search results *(new)*
- **Fix:** Contextually output-encode the echoed search term (and all reflected input) at render time.
- **Regression test:** `q=<script>alert(1)</script>` → the heading shows the literal text, entity-encoded; nothing executes.
- **Why:** Reflection is still output; the sink decides whether input is text or code.

### 21. Quantity tampering — negative quantities *(new)*
- **Fix:** Validate quantity server-side on every cart/checkout mutation: integer, `1 ≤ qty ≤ stock` (and a sane basket cap). Reject — never silently clamp — out-of-range values, and log them during migration.
- **Regression test:** `POST /cart/add` with `qty=-5` → 4xx and the cart is unchanged; `qty=2` still works.
- **Why:** Quantities are multipliers on money; an unvalidated multiplier is an attacker-chosen discount (pairs with the #4 fix).

### 22. Sensitive data exposure via /api/users *(new)*
- **Fix:** Remove the endpoint, or require authentication + admin authorization and return minimal fields (never passwords or hashes). Audit *all* routes for unauthenticated data returns before release.
- **Regression test:** `GET /api/users` with no session → 401/404; with a customer session → 403; admin view (if kept) contains no password material.
- **Why:** Anything deployed is attack surface; an unauthenticated user-table dump converts every other flaw into instant account takeover.
