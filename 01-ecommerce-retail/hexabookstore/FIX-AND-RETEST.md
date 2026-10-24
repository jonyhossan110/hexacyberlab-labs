# HexaBookStore — Fix & Retest Guide

For every vulnerability: the secure implementation pattern, the regression
test that proves the fix, and why the fix works. Apply fixes in a *copy* of
the lab, then re-run both the original exploit (must fail) and the normal
business flow (must still work).

---

## 1. Ebook Download Without Purchase
- **Fix:** In `/read/:id`, load the session user and require a library
  entry: `library.some(l => l.userId === user.id && l.bookId === id &&
  l.edition === 'Ebook')`. Return 403 otherwise. Require login first.
- **Regression test:** As Priya, `GET /read/2` → **403** (was 200 with full
  text). As Priya, `GET /read/1` (owned) → **200**. Logged-out → redirect
  to login.
- **Why:** Digital goods need an *object-level* authorisation check on
  every request — owning the file's URL must never be enough.

## 2. Edition-Upgrade Flaw
- **Fix:** Delete the `grantEdition_` field entirely. At checkout, the
  granted edition is read from the server-side cart item — the same value
  that was priced. Client input never decides fulfilment.
- **Regression test:** Replay the tampered checkout (Collector in the
  body). Order shows *Paid = Delivered = Paperback*, and the library gains
  Paperback only.
- **Why:** One server-side source of truth for "what was sold" removes the
  gap between charging and granting.

## 3. Preorder Price-Lock Bypass
- **Fix:** Ignore any client-sent price. The server charges
  `book.preorderPrice` from its own catalogue, full stop.
- **Regression test:** POST `/preorder/13` with `price=0.01` → order total
  is **$19.99**.
- **Why:** A "lock" only exists if the server enforces it; anything the
  browser carries is a suggestion, not a control.

## 4. Gift-Transfer Flaw
- **Fix:** Derive the source library from the *session*, never the body.
  Require a matching library entry owned by the caller, then **move** it
  (remove from giver, add to recipient) inside one operation.
- **Regression test:** As Priya, POST `/gift` with `fromUser=3` → **403 /
  no transfer**; Lena gains nothing; a legitimate gift of Priya's own
  book 1 works and *removes* it from Priya's library (no duplication).
- **Why:** Ownership must be proven server-side, and a transfer that
  doesn't debit the source is a printing press, not a gift.

## 5. Price Tampering at Checkout
- **Fix:** Remove per-item price fields from the checkout form. Totals are
  recomputed server-side from catalogue prices × cart quantities, minus
  validated discounts.
- **Regression test:** Replay checkout with `price_1=0.50` → order total
  reflects the real catalogue price.
- **Why:** Prices are server data. The client's only pricing input should
  be *which items* and *which coupon codes* — never amounts.

## 6. Order IDOR
- **Fix:** In `/orders/:id`, require `order.userId === session.user.id`
  (or an admin role). Otherwise 404 (preferred — doesn't confirm the
  order exists).
- **Regression test:** As Priya, `GET /orders/1002` → **404**; her own
  orders still open; admin can open any order.
- **Why:** Every object fetch must be scoped to its owner.

## 7. Library IDOR
- **Fix:** `/user/:id/library` returns data only when `:id` equals the
  session user (or admin). Remove the cross-user links entirely.
- **Regression test:** As Omar, `GET /user/2/library` → **403/404**;
  `/library` (own) works.
- **Why:** A library is private account data, not a public profile.

## 8. Stored XSS in Reviews
- **Fix:** Output-encode review text (and every user-controlled string) at
  render time: the lab's `esc()` helper already exists — apply it to
  `r.text` in `pageBook`. Keep input as-is; encode on output.
- **Regression test:** Post `<script>alert('xss')</script>` as a review →
  the book page shows the literal text, no alert fires, and the HTML
  source contains `&lt;script&gt;`.
- **Why:** Encoding on output neutralises stored payloads for every
  viewer and every future template, without mangling stored data.

## 9. Role Tampering via Cookie
- **Fix:** Sign the session cookie (HMAC with a server secret) or — better
  — store only an opaque random session id server-side. Never read `role`
  from the client; look the role up from the user record on each request.
- **Regression test:** Hand-edit the cookie role to `admin` → the cookie
  is rejected / `/admin` returns **403** and the user is treated as a
  customer.
- **Why:** Anything the client can edit, the client controls. Authority
  data must be integrity-protected or kept server-side.

## 10. Coupon Stacking + Unlimited Reuse
- **Fix:** Track applied codes as a *set* per cart (reject duplicates),
  record redemptions per user per code, and enforce each promotion's
  rules (one-per-customer, expiry, stackable-or-not) server-side.
- **Regression test:** Apply `WELCOME10` twice → second attempt is
  rejected ("already applied"), discount stays 10%; after checkout, the
  same code on a new order is rejected for that user.
- **Why:** Promotion rules are business invariants; they belong in
  server-side state, not in how many times a form can be submitted.

## 11. CSRF
- **Fix:** Add a per-session anti-CSRF token (hidden field) to every
  state-changing form and verify it on POST; set the session cookie
  `SameSite=Lax` (or `Strict`) as defence in depth.
- **Regression test:** Submit the profile form from a cross-origin page
  without a token → **403**, profile unchanged; the normal in-app form
  (with token) still saves.
- **Why:** Tokens bind a request to a form the server actually rendered,
  which a cross-site attacker cannot read.

## 12. Predictable Password-Reset Token
- **Fix:** Generate tokens with `crypto.randomBytes(32)`, store only a
  hash, expire after 15–30 minutes, make them single-use, and never
  derive them from user id or date.
- **Regression test:** Request two resets → tokens are long, unrelated,
  and unpredictable; yesterday's/guessed tokens are rejected; a used
  token cannot be replayed.
- **Why:** A reset token is a temporary password — it needs a password's
  entropy, lifetime, and one-time semantics.

## 13. Unrestricted Avatar Upload
- **Fix:** Allowlist image types (png/jpg/gif), verify by content
  sniffing (magic bytes), re-encode images server-side, store under a
  random filename, and serve from a separate static path with
  `Content-Disposition`/a fixed image content type and
  `X-Content-Type-Options: nosniff`.
- **Regression test:** Upload `evil.html` → rejected (or stored but never
  served as `text/html`); a real PNG still works as an avatar.
- **Why:** Letting uploaders choose both the bytes *and* the content type
  turns your domain into their hosting.

## 14. SQL-Injection-Style Search
- **Fix:** Never build queries by concatenation. In a real stack: a
  parameterised query (`WHERE title LIKE ?` with `%` + escaped input).
  In this lab's evaluator: treat the input as a literal string — escape
  `%`, `_` and quotes before matching, and apply the staff-only
  exclusion *inside* the data layer so no query shape can bypass it.
- **Regression test:** Search `' OR '1'='1` → **0 results** (no title
  literally contains it); search `Clockwork` → exactly book 1; the
  staff-only listing appears in no result set, ever.
- **Why:** Injection dies when user input can only ever be data — and
  row-level filters must live below the query language, not beside it.

---

## Retest protocol (for all fixes)

1. Restart the lab to return to seed state.
2. Run the original exploit steps from `VULNERABILITIES.md` — each must
   now **fail** as described in its regression test.
3. Run the matching happy path (buy, gift your own book, apply one coupon,
   reset your own password, upload a real avatar, search normally) — each
   must still **work**.
4. Record both results per flaw. A fix that breaks the business flow is
   not a fix; it's a different bug.

---

## LAB 9 additions (tests 15–26)

## 15. SQL Injection Login Bypass (`auth-sqli-login`)
- **Fix:** Delete the legacy concatenated-query path. Authenticate with a
  parameterised query / direct record comparison only — user input is
  data, never query text. Audit the codebase for other string-built
  queries.
- **Regression test:** POST `/login` with email
  `admin@hexabookstore.local'--` and any password → login refused.
  Normal login still works.
- **Why:** Parameterisation removes the entire injection class at the
  sink; the input can no longer change the query's structure.

## 16. Brute Force — No Rate Limiting (`auth-brute-force`)
- **Fix:** Throttle per account and per IP: exponential backoff or a
  temporary lock after ~5 failures, plus CAPTCHA/bot checks and alerting
  on credential-stuffing patterns. Return remaining-attempt information
  only generically.
- **Regression test:** 10 rapid wrong passwords → responses become
  delayed/locked (429/423) well before the 10th; a correct login after
  the lock window still succeeds.
- **Why:** Attackers win by volume; rate limiting makes online guessing
  economically useless.

## 17. Account Enumeration via Reset (`auth-enumeration`)
- **Fix:** One identical response for every email — "If an account
  exists, reset instructions were sent" — with the same status, timing
  shape and page. Never render reset links to unauthenticated callers.
- **Regression test:** POST `/forgot` for an existing and a non-existing
  email → byte-identical status + body, no reset link in either.
- **Why:** Existence is metadata attackers harvest; uniform responses
  keep the reset flow from becoming a directory.

## 18. Default & Documented Demo Credentials (`auth-default-creds`)
- **Fix:** Force a password change on first login for every seeded
  account; never ship documented passwords to production; generate
  per-install admin credentials; disable demo accounts outside the lab.
- **Regression test:** Clean install: `Admin@123` / `User@123` no longer
  authenticate anywhere; first-login flow forces new passwords.
- **Why:** A credential everyone knows is not a credential — it is a
  public key to the building.

## 19. Mass Assignment (`profile-mass-assignment`)
- **Fix:** Bind an explicit allow-list of fields (`name`, `email`) to the
  user record. `role` (and any other privileged field) is set only by
  server-side business logic, never copied from request data.
- **Regression test:** POST `/register` and `/profile` with `role=admin`
  → account remains `customer`; `/admin` still 403.
- **Why:** The server must decide which fields a request may influence;
  frameworks that bind everything bind the privileges too.

## 20. Stored XSS via Display Name (`profile-name-xss`)
- **Fix:** Output-encode the display name at *every* render point
  (byline, profile, admin tables) and validate names server-side
  (length, character set). A central encoding helper makes "forgot one
  spot" unlikely.
- **Regression test:** Name `<script>alert(1)</script>` renders as inert
  text everywhere; no alert fires; the literal string appears encoded in
  the HTML source.
- **Why:** Stored payloads execute in other users' browsers under the
  site's trust — encode on output, always, in every context.

## 21. Weak Password Policy (`profile-weak-password`)
- **Fix:** Enforce a minimum length (12+) and a breached-password check
  (e.g. against a known-compromised list) at register, reset and change.
  Apply the same policy to seeded/admin accounts.
- **Regression test:** Register with password `x` → rejected with a
  policy error; a compliant password succeeds.
- **Why:** Short passwords fall to brute force in seconds — doubly so
  when nothing throttles the guessing (see #16).

## 22. Reflected XSS in Search (`search-reflected-xss`)
- **Fix:** Context-encode the echoed search term (HTML-encoding is
  enough for an HTML text context) and add a restrictive
  Content-Security-Policy as defence in depth.
- **Regression test:** Search `<script>alert(1)</script>` → the results
  page shows the literal text, encodes it in source, and nothing
  executes.
- **Why:** Reflected input is attacker-controlled output; encoding
  breaks the payload without breaking the feature.

## 23. Quantity Tampering (`cart-qty-tamper`)
- **Fix:** Validate quantity server-side as an integer in a sane range
  (1–10 per line, say) and recompute totals from catalogue prices ×
  validated quantities only.
- **Regression test:** POST `/cart/setqty` with qty `-2` and `100000` →
  rejected/clamped; cart totals reflect only valid quantities.
- **Why:** Quantities are money inputs; unvalidated money inputs are how
  "negative discounts" happen.

## 24. Path Traversal in Sample Downloads (`files-traversal`)
- **Fix:** Resolve the requested name against the samples directory and
  verify the resolved path still starts with that directory
  (`path.resolve` + prefix check), or serve from an allow-list of known
  sample files. Reject everything else with 404.
- **Regression test:** `/sample?file=../server.js` and
  `/sample?file=%2e%2e%2fserver.js` → 404; `/sample?file=chapter-1.txt`
  → 200.
- **Why:** User input must never become a filesystem path unchecked —
  the filesystem is the server's private space.

## 25. Admin Data Export Without Authorisation (`admin-data-export`)
- **Fix:** Require the admin role on `/admin/export` exactly as on
  `/admin`; never include password material in any export (store hashes,
  export none of them); log every export with the actor's id.
- **Regression test:** As a customer, `GET /admin/export` → 403. As
  admin → 200 with no password fields present in the payload.
- **Why:** An export is a bulk-read of the crown jewels; it needs the
  strongest check in the app, not the weakest.

## 26. Missing Security Headers (`platform-headers`)
- **Fix:** Set on all responses: `Content-Security-Policy` (start with
  `default-src 'self'`), `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY` (or CSP `frame-ancestors`), and
  `Referrer-Policy`.
- **Regression test:** `curl -I` on several routes → all four headers
  present; the store cannot be framed by a third-party page.
- **Why:** Headers are cheap, always-on browser enforcement — they
  blunt whole classes of follow-on attacks (framing, sniffing) even
  when a content bug slips through.
