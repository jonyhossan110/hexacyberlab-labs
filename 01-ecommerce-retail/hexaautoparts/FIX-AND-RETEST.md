# HexaAutoParts — Fix & Retest Guide

For each of the 22 intentional vulnerabilities in
[VULNERABILITIES.md](VULNERABILITIES.md): the secure implementation, a
curl-level regression test, and why the fix works.

**How to read the tests:** each test performs the *attack* against a running
server (`node server.js`, http://127.0.0.1:3016). On the **vulnerable** build
the attack succeeds → the test **FAILS** (vulnerability present). On a
**fixed** build the same request must be rejected or neutralised → the test
**PASSES**. Run the normal user journey (register → login → cart → checkout)
after every fix to confirm you didn't break the store.

Common setup used by the tests:

```bash
BASE=http://127.0.0.1:3016
# Log in as Dewan (retail) and keep the session cookies
curl -s -c /tmp/dewan.jar -X POST $BASE/login \
  -d "email=dewan@hexaautoparts.local&password=User@123" -o /dev/null
```

---

## 1. Fitment Bypass — enforce fitment on the server

**Secure implementation:** In `POST /checkout`, after resolving the selected
vehicle, re-run `fitsVehicle()` for every line and reject the order with
`400` if any part is incompatible. The browser warning becomes a courtesy;
the server is the authority.

```js
for (const l of lines) {
  const p = partById(l.partId);
  if (veh && p && !fitsVehicle(p, veh))
    return send(res, 400, layout(req, 'Checkout', '<div class="card warn">Part does not fit the selected vehicle.</div>'));
}
```

**Regression test:**
```bash
curl -s -b /tmp/dewan.jar -X POST $BASE/checkout \
  -d "partId=2&qty=1&vehicleId=1" -o /dev/null -w "%{http_code}\n"
# Vulnerable: 302 (order created for the F-150-only rotor)  → FAIL
# Fixed:     400, and no new order in GET /orders          → PASS
```

**Why:** a check that lives only in the UI is not a control. Every rule that
matters must be re-evaluated server-side at the moment of the transaction.

---

## 2. VIN Lookup — stop exposing owner PII

**Secure implementation:** Require authentication for `/vin`. Return only
vehicle data (make/model/year) to ordinary users; owner name/address/phone
and service history only to the record's owner or an admin. Minimise fields
by default.

**Regression test:**
```bash
curl -s "$BASE/vin?vin=HAP20261002" | grep -c "Rosewood"
# Vulnerable: 1 (Sara's home address, unauthenticated)  → FAIL
# Fixed:     0 (401/403, or a response with no PII)     → PASS
```

**Why:** the endpoint answered a *vehicle* question with *person* data.
Data minimisation + authentication removes both the privacy breach and its
usefulness for social engineering.

---

## 3. VIN Enumeration — unguessable IDs, authorisation, rate limiting

**Secure implementation:** Keep the public identifier unguessable (random
suffix instead of a sequential serial), enforce the per-record authorisation
from Fix #2, and rate-limit lookup attempts per IP/session.

**Regression test:**
```bash
for i in 01 02 03 04 05; do curl -s "$BASE/vin?vin=HAP202610$i"; done \
  | grep -c "Registered owner"
# Vulnerable: 5 full owner records, no login           → FAIL
# Fixed:     0 (requests rejected / not authorised)   → PASS
```

**Why:** sequential IDs turn a single-record leak into a bulk breach.
Unguessable identifiers plus per-record authorisation make enumeration
infeasible even if one record is shared.

---

## 4. Trade-Pricing Bypass — derive the tier from the account, never the request

**Secure implementation:** Delete the `accountType` request parameter from
pricing. The tier is read from the authenticated user's server-side record:
`const accountType = user.role;`

**Regression test:**
```bash
curl -s -b /tmp/dewan.jar -X POST $BASE/checkout \
  -d "partId=1&qty=1&accountType=trade" -o /dev/null -w "%{redirect_url}\n"
# then open the redirected /order?id=… page and read the unit price
# Vulnerable: $41.99 (trade price on a retail account)  → FAIL
# Fixed:     $59.99 (parameter ignored)                 → PASS
```

**Why:** pricing is a server-side business decision based on *who the user
is*, which only the server knows. Anything the client sends about its own
privileges is a claim, not a fact.

---

## 5. Quote IDOR — check ownership on view *and* accept

**Secure implementation:** In both `GET /quote` and `POST /quote/accept`,
load the quote and require `quote.userId === user.id` (admins excepted);
return `404` otherwise so existence isn't leaked.

**Regression test:**
```bash
curl -s -b /tmp/dewan.jar "$BASE/quote?id=501" -o /dev/null -w "%{http_code}\n"
curl -s -b /tmp/dewan.jar -X POST $BASE/quote/accept -d "quoteId=501" -o /dev/null
curl -s -b /tmp/dewan.jar "$BASE/quote?id=501" | grep -o "accepted" | head -1
# Vulnerable: 200, and Sara's quote becomes 'accepted' on Dewan's order  → FAIL
# Fixed:     404 on view; accept rejected; quote stays 'open'          → PASS
```

**Why:** authorisation must be checked on the object, on every action —
including state-changing ones. Hiding the link in the UI is not a check.

---

## 6. Order IDOR — check ownership on read

**Secure implementation:** In `GET /order`, require
`order.userId === user.id` (or admin) before rendering; else `404`.

**Regression test:**
```bash
curl -s -b /tmp/dewan.jar "$BASE/order?id=1002" -o /dev/null -w "%{http_code}\n"
# Vulnerable: 200 (Omar's order rendered for Dewan)  → FAIL
# Fixed:     404                                    → PASS
```

**Why:** sequential IDs are fine *if* every access is authorised against the
object owner. The flaw was never the numbering — it was the missing check.

---

## 7. Price Tampering — prices come from the catalogue, not the form

**Secure implementation:** Ignore all `price_<partId>` fields. Unit price is
always looked up server-side: `let unit = accountType === 'trade' ? p.trade : p.retail;`

**Regression test:**
```bash
curl -s -b /tmp/dewan.jar -X POST $BASE/checkout \
  -d "partId=1&qty=1&price_1=0.01" -o /dev/null -w "%{redirect_url}\n"
# open the order page; read "Total:"
# Vulnerable: $0.01                        → FAIL
# Fixed:     $59.99 (posted price ignored) → PASS
```

**Why:** money values must be computed exclusively from server-side data.
A price field rendered into a form is display output, never input.

---

## 8. Stored XSS in Q&A — escape all user content on render

**Secure implementation:** Pass Q&A text, author and answers through `esc()`
exactly like every other field (the vulnerable code inserts `x.text` raw).
Add a restrictive `Content-Security-Policy` header as defence in depth, and
make session cookies `HttpOnly` so a stray payload can't read them.

**Regression test:**
```bash
curl -s -b /tmp/dewan.jar -X POST $BASE/part/qa \
  -d "partId=1&text=<script>alert(1)</script>" -o /dev/null
curl -s "$BASE/part?id=1" | grep -c "<script>alert(1)</script>"
# Vulnerable: 1 (payload stored and served raw)        → FAIL
# Fixed:     0 (page shows &lt;script&gt; as inert text) → PASS
```

**Why:** output encoding at render time neutralises stored payloads for
every viewer, including admins — the highest-value targets of stored XSS.

---

## 9. SQL-Injection-Style Fitment Search — treat input as data, never as query

**Secure implementation:** In a real deployment: parameterised queries /
prepared statements everywhere. In this lab's simulated layer: drop the
quote-parsing "evaluator" entirely and match the term as a literal substring
only, so quotes and `OR` have no special meaning.

**Regression test:**
```bash
curl -s "$BASE/fitment?q=brake%27%20OR%20%271%27%3D%271" | grep -o "compatible part(s)"
curl -s "$BASE/fitment?q=brake%27%20OR%20%271%27%3D%271" | grep -c "Vented Brake Rotor"
# Vulnerable: tautology returns all 19 parts (rotor included)  → FAIL
# Fixed:     0 matches for the literal payload string; a plain q=brake
#            search still returns the brake parts              → PASS
```

**Why:** injection happens when untrusted input is allowed to change the
*structure* of a query. Parameterisation (or literal matching) keeps input
in the data plane permanently.

---

## 10. Role Tampering via Cookie — roles live server-side only

**Secure implementation:** Delete `effectiveRole()`'s cookie branch. The role
is read from the server-side user record reached through the session map —
nothing the client sends can influence it. (If a role must ride in a cookie,
HMAC-sign it and verify the signature; `HttpOnly` alone does not stop the
*user* from editing their own cookie.)

```js
function effectiveRole(req, user) { return user ? user.role : null; }
```

**Regression test:**
```bash
curl -s -b /tmp/dewan.jar --cookie "role=admin" $BASE/admin \
  -o /dev/null -w "%{http_code}\n"
# (send the forged role cookie alongside Dewan's real session cookie)
# Vulnerable: 200 — full admin dashboard  → FAIL
# Fixed:     403                          → PASS
```

**Why:** authorisation state must be derived from data the client cannot
write. A plain cookie is client storage, not a credential.

---

## 11. CSRF on Vehicle & Profile Changes — tokens + SameSite

**Secure implementation:** Generate a per-session CSRF token, embed it as a
hidden field in every state-changing form, and verify it on every POST
(reject with `403` when missing/mismatched). Set session cookies
`SameSite=Lax` as a second layer, and check `Origin` on POSTs.

```js
// on POST: if (f.get('csrf') !== req.sessionCsrf) return send(res, 403, …)
```

**Regression test:**
```bash
# a cross-site form would submit exactly this: cookies, but no token
curl -s -b /tmp/dewan.jar -X POST $BASE/settings \
  -d "name=Pwned" -o /dev/null -w "%{http_code}\n"
curl -s -b /tmp/dewan.jar $BASE/profile | grep -c "Pwned"
# Vulnerable: 302 and the name is changed (grep = 1)  → FAIL
# Fixed:     403 and the name is unchanged (grep = 0) → PASS
# (the legitimate form still works because it carries the token)
```

**Why:** the browser attaches cookies automatically; the token proves the
request came from a page the server generated. SameSite limits the cookie's
journey in the first place.

---

## 12. Predictable Password-Reset Token — random, hashed, expiring, single-use

**Secure implementation:** On `/forgot`, generate
`crypto.randomBytes(32).toString('hex')`, store only its SHA-256 hash with a
15-minute expiry, and delete it after one successful use. Never derive
tokens from user data.

**Regression test:**
```bash
TOKEN=$(node -e "console.log(Buffer.from('sara@hexaautoparts.local').toString('hex').slice(0,10))")
curl -s -X POST $BASE/forgot -d "email=sara@hexaautoparts.local" -o /dev/null
curl -s -X POST $BASE/reset \
  -d "email=sara@hexaautoparts.local&token=$TOKEN&password=Hacked@123" -o /dev/null
curl -s -X POST $BASE/login \
  -d "email=sara@hexaautoparts.local&password=Hacked@123" -o /dev/null -w "%{http_code}\n"
# Vulnerable: 302 — deterministic token accepted, account taken over  → FAIL
# Fixed:     401 — computed token rejected; only the issued random
#            token (delivered via the simulated inbox link) works     → PASS
```

**Why:** a token's only job is to prove possession of the mailbox. If it can
be computed from public data (the email itself), it proves nothing.

---

## 13. Returns IDOR — authorise the object on state-changing actions too

**Secure implementation:** In `POST /returns`, load the order and require
`order.userId === user.id` before creating the return; else `404`.

**Regression test:**
```bash
curl -s -b /tmp/dewan.jar -X POST $BASE/returns \
  -d "orderId=1002&reason=Damaged" -o /dev/null -w "%{http_code}\n"
curl -s -b /tmp/dewan.jar $BASE/returns | grep -c "1002"
# Vulnerable: 302; a pending return against Omar's order exists  → FAIL
# Fixed:     403/404; Dewan's returns list has no order 1002     → PASS
```

**Why:** read-only IDOR leaks data; write IDOR *does* things — refunds,
cancellations, workflow chaos. Every action on an object needs the same
ownership check as viewing it.

---

## 14. Coupon Reuse — keep a redemption ledger

**Secure implementation:** Record every redemption
(`{ code, userId, orderId, at }`). Enforce the campaign rules server-side at
checkout: one use per user per code (or the campaign's stated limit), no
stacking unless explicitly allowed, and reject replays with a clear message.

**Regression test:**
```bash
for n in 1 2; do
  curl -s -b /tmp/dewan.jar -X POST $BASE/checkout \
    -d "partId=3&qty=1&coupon=GARAGE25" -o /dev/null
done
curl -s -b /tmp/dewan.jar $BASE/orders | grep -o '\$9\.74' | wc -l
# Oil filter is $12.99; with 25% off it totals $9.74.
# Vulnerable: 2 discounted orders (code works forever)        → FAIL
# Fixed:     1 — the second order is $12.99 (or the checkout
#            is rejected with "code already used")            → PASS
```

**Why:** a promotion without accounting is an unlimited, unattributable
price cut. The ledger makes each code's use finite, auditable, and
revocable.

---

## 15. SQL Injection Login Bypass — parameterise the authentication query

**Secure implementation:** The login lookup must treat credentials as data:
a prepared statement (`WHERE email = ?`) and a constant-time password-hash
comparison. Remove the naive string-built "legacy" evaluation from the auth
path entirely.

**Regression test:**
```bash
curl -s -X POST $BASE/login --data-urlencode "email=admin@hexaautoparts.local' OR '1'='1" \
  --data-urlencode "password=whatever" -o /dev/null -w "%{http_code}\n"
# Vulnerable: 302 (session created as admin, no password)  → FAIL
# Fixed:     401 (treated as a literal, unknown email)    → PASS
```

**Why:** when input can never change the query's structure, a quote is just
a character in an email address that does not exist.

---

## 16. Brute Force — throttle and lock out failed logins

**Secure implementation:** Count failures per account + IP; after a small
threshold (e.g. 5) apply progressive delays, then a temporary lockout
(15–30 min) with alerting. Pair with MFA for privileged accounts.

**Regression test:**
```bash
for n in $(seq 1 10); do curl -s -X POST $BASE/login \
  -d "email=dewan@hexaautoparts.local&password=wrong$n" -o /dev/null; done
curl -s -X POST $BASE/login \
  -d "email=dewan@hexaautoparts.local&password=User@123" -o /dev/null -w "%{http_code}\n"
# Vulnerable: 302 — the correct password sails in right after
#             10 unthrottled failures                        → FAIL
# Fixed:     429/401 — the account is locked/throttled     → PASS
```

**Why:** guessing only works when attempts are free. A lockout turns a
wordlist attack into a handful of noisy, blocked tries.

---

## 17. User Enumeration — one response for every reset request

**Secure implementation:** `/forgot` returns the identical message and
timing whether or not the account exists ("If the account exists, we have
emailed a reset link"). Apply the same uniformity to login errors.

**Regression test:**
```bash
curl -s -X POST $BASE/forgot -d "email=sara@hexaautoparts.local"  | grep -c "Reset link sent"
curl -s -X POST $BASE/forgot -d "email=nobody@nowhere.test"       | grep -c "No account"
# Vulnerable: 1 and 1 — two different answers (oracle)     → FAIL
# Fixed:     the two responses are indistinguishable       → PASS
```

**Why:** an oracle that confirms which emails are registered aims every
later attack. Uniform responses give nothing away.

---

## 18. Mass Assignment at Registration — allowlist the fields

**Secure implementation:** Build the account from an explicit allowlist
(name, email, password, address). Set `role` server-side to `retail`;
role changes happen only through an admin workflow.

**Regression test:**
```bash
curl -s -c /tmp/eve.jar -X POST $BASE/register \
  -d "name=Eve&email=eve2@test.local&password=Whatever1&role=admin" -o /dev/null
curl -s -c /tmp/eve.jar -X POST $BASE/login \
  -d "email=eve2@test.local&password=Whatever1" -o /dev/null
curl -s -b /tmp/eve.jar $BASE/admin -o /dev/null -w "%{http_code}\n"
# Vulnerable: 200 (self-registered "admin" opens the dashboard)  → FAIL
# Fixed:     403 (the account is retail; role was ignored)       → PASS
```

**Why:** the server, not the request, decides who is an admin. Copying
request fields onto privileged objects hands that decision to the attacker.

---

## 19. Weak Password Policy — enforce a minimum standard

**Secure implementation:** At registration and reset require ≥10–12
characters and screen against known-breached password lists; store with
bcrypt/argon2.

**Regression test:**
```bash
curl -s -X POST $BASE/register \
  -d "name=W&email=w2@test.local&password=x" -o /dev/null -w "%{http_code}\n"
# Vulnerable: 302 (one-character password accepted)  → FAIL
# Fixed:     400 (policy rejection)                  → PASS
```

**Why:** users pick the weakest password they are allowed. The policy is
the floor under every account the business owns.

---

## 20. Reflected XSS in the Part Finder — encode reflected output

**Secure implementation:** HTML-encode the search term (and every reflected
value) at render time, in the correct context; add a restrictive CSP.

**Regression test:**
```bash
curl -s "$BASE/fitment?q=%3Cscript%3Ealert(1)%3C/script%3E" | grep -c "Results for: <script>alert(1)</script>"
# Vulnerable: 1 (payload reflected as live markup)     → FAIL
# Fixed:     0 (term shown as &lt;script&gt; text)    → PASS
```

**Why:** output encoding makes the browser treat the term as text. The
payload still "appears" — as inert characters a user can read, not run.

---

## 21. Negative Quantity — validate quantity on every order path

**Secure implementation:** At checkout (cart AND direct-buy) parse
quantity strictly: integer, 1 ≤ qty ≤ current stock. Reject anything else
with a 400. Recompute totals from validated quantities.

**Regression test:**
```bash
curl -s -b /tmp/dewan.jar -X POST $BASE/checkout -d "partId=3&qty=-5" -o /dev/null -w "%{http_code}\n"
curl -s -b /tmp/dewan.jar $BASE/orders | grep -c -- "-64.95"
# Vulnerable: order created; a $-64.95 line appears in orders  → FAIL
# Fixed:     400, and no negative order exists                → PASS
```

**Why:** an unvalidated quantity is an unvalidated price. Range checks on
every path — not just the pretty one — close the whole class.

---

## 22. Customer Data Export — authenticate, authorise, minimise

**Secure implementation:** `/api/customers` requires a valid session AND
the admin role; return only the fields the consumer needs (never the full
PII set by default); log every export access.

**Regression test:**
```bash
curl -s $BASE/api/customers -o /dev/null -w "%{http_code}\n"   # no cookies at all
# Vulnerable: 200 with every customer's email/address/phone  → FAIL
# Fixed:     401/403                                         → PASS
```

**Why:** "unlinked" is not "protected". Every endpoint is attack surface;
exports of PII are the highest-value target on the box.

---

## Whole-lab retest protocol

1. Restart the server (fresh seed data) after applying fixes.
2. Run all 22 regression tests — every one must PASS.
3. Run the legitimate journeys end-to-end as each role (retail, trade,
   admin): register → login → fitment search → cart → checkout → order →
   return of *own* order → quote request/accept of *own* quote. A fix that
   breaks the business is not a fix.
4. Re-run the PRACTICE-GUIDE challenges: Beginner and Intermediate exploits
   must now fail; document any that still succeed as open findings.
