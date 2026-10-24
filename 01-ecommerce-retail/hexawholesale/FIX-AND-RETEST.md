# HexaWholesale — Fix & Retest Guide

For each vulnerability: the **secure implementation** (what correct code does), a **regression test** (the attack must now fail; the legitimate flow must still work), and **why it matters**. Work on a **copy** of the lab — keep the original vulnerable for practice. IDs match `VULNERABILITIES.md`.

---

### V1 — PO self-approval
- **Fix:** On the approve endpoint, require `role === 'approver'`, the approver's `companyId` to equal the PO's company, **and** `approver.id !== po.buyerId` (separation of duties). Hide the button for non-approvers, but enforce server-side regardless.
- **Regression test:** Buyer POSTs `/pos/<own>/approve` → **403**, status unchanged. Approver (different user, same company) approves → 200, invoice created. Approver from another company → 403.
- **Why:** Approval is a financial control. If the requester can self-approve, the control doesn't exist — every other limit (credit, price) can be pushed through by one person.

### V2 — Cross-tenant PO access (IDOR)
- **Fix:** On every PO read/write, check `po.companyId === user.companyId` (admins excepted). Return 404 (not 403) for other tenants' objects to avoid confirming existence.
- **Regression test:** Company A GETs `/pos/1002` → **404**. A GETs its own PO → 200. Repeat for submit/approve/lines/rebate actions.
- **Why:** Tenant isolation is the core promise of a multi-company platform; one missing check exposes every customer's purchasing data.

### V3 — Bulk-tier manipulation
- **Fix:** Ignore any client-supplied tier. Compute the tier **server-side from the actual quantity** (`priceFor(product, qty, companyId)`), and never accept pricing inputs on create.
- **Regression test:** Create PO qty 10 with `claimedTier=200` → charged unit price is the 10-tier price. Qty 200 → 200-tier price (legitimate path still works).
- **Why:** Prices are the server's decision. Trusting client claims about quantity brackets hands every buyer your best discount.

### V4 — Credit-limit bypass
- **Fix:** Enforce server-side at submit **and** approve: `creditUsed + sum(open PO totals) + this PO total <= creditLimit`, inside the same transaction that changes status. The browser warning stays as UX only.
- **Regression test:** Company C submits POs beyond available credit → **422/limit error**, status stays draft. A within-limit PO submits normally.
- **Why:** Credit limits are a risk decision made by the platform. Client-only enforcement is no enforcement — anyone with curl ignores it.

### V5 — Mass assignment on settings
- **Fix:** Whitelist assignable fields (`name`, `contactEmail`, `address`, `country`) and build the update explicitly. Never `Object.assign` a request body onto a model. `creditLimit`, `creditUsed`, `tier` change only via admin endpoints.
- **Regression test:** POST settings with `creditLimit=999999` added → saved settings show the original limit; other whitelisted fields update normally.
- **Why:** Mass assignment converts any "profile form" into a privilege-escalation primitive against whatever fields the model carries.

### V6 — Negotiated-price leak
- **Fix:** Filter the API by the caller's company: `negotiatedPrices.filter(n => n.companyId === user.companyId)`. Admins may see all — via the admin role, server-side.
- **Regression test:** As Company A, GET `/api/negotiated-prices` → only Company A rows. Response contains no other company names/prices.
- **Why:** Negotiated terms are confidential commercial data; leaking them to competitors is a direct financial and trust loss.

### V7 — Invoice IDOR
- **Fix:** Same tenant check as V2 on both the view and download routes: `invoice.companyId === user.companyId` or admin; otherwise 404.
- **Regression test:** Company A GETs `/invoices/2002` and `/invoices/2002/download` → **404** both. A opens INV-2001 → 200 + file downloads.
- **Why:** Invoices are financial documents. Cross-tenant access enables fraud (convincing fake invoices) and breaches confidentiality obligations.

### V8 — Stored XSS in PO notes
- **Fix:** Output-encode notes (and every user-supplied string) at render time — the lab's `esc()` helper exists; notes must go through it too. Defence in depth: add a restrictive `Content-Security-Policy` header.
- **Regression test:** Save a note containing `<script>alert(1)</script>` → PO page shows the literal text, no alert fires, page source shows `&lt;script&gt;`.
- **Why:** The payload targets approvers/admins — the highest-value users. Stored XSS in an approval workflow can steal sessions or forge approvals from the victim's browser.

### V9 — CSRF on approve (GET state change)
- **Fix:** State changes only via POST, protected by a per-session anti-CSRF token verified server-side. Remove the GET approve-link entirely (emailed links should land on a confirmation page, not perform the action).
- **Regression test:** GET `/pos/<id>/approve-link` → **405/404**. POST approve without/with a wrong token → **403**. POST with the session token → works.
- **Why:** A GET that changes state can be triggered by any image, link preview or prefetch in the victim's browser — no click on your site required.

### V10 — Role cookie tampering
- **Fix:** Never trust a client-supplied role. Store the role **server-side in the session record**; the cookie carries only an opaque, unguessable session ID. Re-check role from the session on every privileged request.
- **Regression test:** Set `role=admin` cookie manually as a buyer → `/admin` returns **403**. Real admin login → 200.
- **Why:** Anything the client can edit is not an authorisation decision. One cookie edit must never equal platform admin.

### V11 — Line price tampering
- **Fix:** Remove client control of prices entirely: line prices are recalculated server-side from product + quantity + company pricing whenever a PO is created or amended. If price amendments are a real business need, gate them behind an admin-only, audited endpoint.
- **Regression test:** POST `/pos/<id>/lines` with `unitPrice=0.01` → price unchanged (or endpoint absent). Creating a PO with a `unitPrice` field → field ignored, tier price used.
- **Why:** If the buyer sets the price, the invoice documents the fraud as if it were legitimate — detection becomes nearly impossible downstream.

### V12 — Predictable reset tokens
- **Fix:** Generate tokens with a CSPRNG (`crypto.randomBytes(32).toString('hex')`), store only a hash, expire after ~30 minutes, single-use, and never display the token anywhere except the (simulated) email to the account owner. Rate-limit reset requests.
- **Regression test:** Two consecutive reset requests produce unrelated, unguessable tokens; guessing neighbours of a valid token fails; a used/expired token fails; the reset flow still works end-to-end with the real token.
- **Why:** A reset token is a temporary password. Sequential tokens hand account takeover of *any* account — including admins — to anyone who can count.

### V13 — Rebate stacking
- **Fix:** Track code usage: one rebate per PO, per-company redemption caps, and a global rules check server-side before applying (`if (po.rebateCode) reject`). Validate the resulting discount against a maximum (e.g. ≤ 25%).
- **Regression test:** Apply `WHOLESALE10` twice to one PO → second application rejected, total reflects exactly 10% off. First application still works.
- **Why:** Promotions are commercial policy. Unlimited stacking turns a 10% goodwill code into an unbounded discount chosen by the buyer.

### V14 — Injection-style search bypass
- **Fix:** In a real stack: parameterised queries / prepared statements — user input is data, never query structure. In this simulation: treat the search term as a plain substring only, always apply the `internal = 0` visibility filter, and **never render cost prices** to buyer roles.
- **Regression test:** Search `' OR '1'='1` → zero results (no product literally matches that string), internal product absent, no cost-price column for buyers. Normal search (`scanner`) still finds products.
- **Why:** Injection breaks the query's logic itself — filters, tenancy and visibility rules written into the query all fall at once, which is why internal data and cost prices leaked together.

---

## Tests added in the lab-system rebuild

### auth-sqli — SQL injection login bypass
- **Fix:** Remove the string-built query path entirely. Look the user up with a parameterised query and verify the password hash — input is data, never query structure.
- **Regression test:** Login with email `' OR '1'='1' -- ` → **401** like any bad login. Legitimate credentials still log in.
- **Why:** An injectable login is a skeleton key: one string takes the attacker past the front door as the most privileged account the query can reach.

### auth-brute — No rate limiting on login
- **Fix:** Add per-account and per-IP throttling with progressive delay and temporary lockout (or CAPTCHA) after repeated failures; alert on spikes. Consider MFA for privileged accounts.
- **Regression test:** 10 rapid failed logins for one account → attempts are delayed/blocked (e.g. **429** or lockout message) before the 10th completes; a correct login after the cool-down still works.
- **Why:** Without throttling, password guessing is free and silent — the only cost to the attacker is bandwidth.

### auth-enum — User enumeration via reset responses
- **Fix:** Return one identical generic response for every reset request ("If the account exists, we've emailed a link"), and send the actual email only to real account owners.
- **Regression test:** Forgot-password for an existing and a non-existing email returns byte-identical status and message; no token or link is ever shown in the HTTP response.
- **Why:** Any response difference is a verified target list — enumeration is the reconnaissance that makes every later attack cheaper.

### auth-default — Default / demo credentials
- **Fix:** No shipped default accounts in production. Generate per-install admin credentials, force a change at first login, and never document live passwords.
- **Regression test:** `Admin@123` / `User@123` no longer authenticate anywhere; a fresh install forces an admin password change before first use.
- **Why:** Default credentials are public knowledge the moment they ship — they convert "attacker" into "anyone who read the manual".

### reg-weak — Weak password policy at registration
- **Fix:** Enforce a password policy at registration and reset (minimum 12 characters; screen against known-breached lists), applied server-side.
- **Regression test:** Registering with password `x` → **rejected** with a policy message; a compliant password registers and logs in.
- **Why:** Policy set at creation is the cheapest control in the whole system; skipping it poisons every account from day one.

### reg-mass — Mass assignment at registration
- **Fix:** Build the company record from an explicit whitelist (`name`, `contactEmail`, …). `creditLimit` is assigned by the platform's onboarding workflow only, never from the request body.
- **Regression test:** Register with `creditLimit=777777` in the body → the new company's limit is the standard $10,000; normal registration still works.
- **Why:** The registration form is unauthenticated attack surface — letting it set financial fields hands strangers the platform's credit pen.

### settings-csrf — CSRF on company settings
- **Fix:** Require a per-session anti-CSRF token on the settings POST (verified server-side), and set session cookies `SameSite=Lax`.
- **Regression test:** A settings POST from a foreign Origin without the token → **403**, company unchanged; the in-app form (with token) saves normally.
- **Why:** The victim's browser will send their session cookie to any site — the token is the only proof the request was intended.

### search-xss — Reflected XSS in search results
- **Fix:** HTML-encode the echoed search term (and all reflected input) at render; keep the encoded query display. Add a restrictive CSP as defence in depth.
- **Regression test:** Search for `<script>alert(1)</script>` → the results page shows the literal text, no script executes, and the page source shows `&lt;script&gt;`.
- **Why:** A reflected payload turns the client's own trusted domain into the delivery vehicle for session theft against their staff.

### po-qty — Quantity not validated against stock
- **Fix:** Validate quantity server-side at create, submit and approve: positive integer, ≤ available stock, and within per-order maxima.
- **Regression test:** Creating a PO for 2,000 units of a 1,400-stock product → **rejected/clamped with an error**; a within-stock PO still creates, submits and approves normally.
- **Why:** Inventory is a physical fact. Orders that ignore it become broken promises to customers and chaos for fulfilment.

### platform-headers — Missing security headers
- **Fix:** Send a baseline header set on every response: `Content-Security-Policy` (restrictive, e.g. `default-src 'self'`), `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.
- **Regression test:** `curl -I` on catalogue, login and PO pages shows the full header set; the app still renders and functions (adjust CSP directives to the app's real needs rather than dropping the header).
- **Why:** Headers are platform-wide defence in depth — CSP blunts the XSS findings above, frame protection kills clickjacking — for near-zero engineering cost.
