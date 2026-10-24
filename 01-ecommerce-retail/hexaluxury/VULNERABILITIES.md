# HexaLuxury — Intentional Vulnerabilities (Full Test Map)

**23 vulnerability tests**, grouped by feature — every feature carries every
technique that applies to it. Each test is **auto-detected** by the lab: it
completes when the exploit genuinely succeeds (see `/tests` in the running
lab). Fixes for all 23: `FIX-AND-RETEST.md`. Challenges: `PRACTICE-GUIDE.md`.

---

## Login & Authentication (6)

### A1. SQL Injection Login Bypass *(new in the system rebuild)*
- **OWASP:** A03 — Injection (CWE-89)
- **Location:** `POST /login` (legacy string-built query)
- **Exploitation:** The login still runs through a legacy query builder that
  concatenates input. Email `' OR '1'='1' -- ` with any password makes the
  condition always-true and logs you in as the first account — the admin.
- **Business impact:** Instant, password-free takeover of any account,
  including admin.

### A2. No Brute-Force Protection on Login *(new)*
- **OWASP:** A07 — Authentication Failures (CWE-307)
- **Location:** `POST /login`
- **Exploitation:** Submit wrong passwords forever: no throttle, no lockout, no
  CAPTCHA. The lab marks this after the 10th consecutive failure for one
  account is still processed like the first.
- **Business impact:** Credential guessing at full speed against high-value
  clients.

### A3. Account Enumeration via Password Reset *(new)*
- **OWASP:** A07 — Authentication Failures (CWE-204)
- **Location:** `POST /forgot`
- **Exploitation:** A registered email gets "a reset link has been sent"; an
  unregistered one gets "No account exists for that email address." The
  difference validates any email against the member registry.
- **Business impact:** Precision target lists for phishing and credential
  stuffing.

### A4. Predictable Password-Reset Token
- **OWASP:** A07 — Authentication Failures (CWE-337)
- **Location:** `POST /forgot`, `POST /reset` — token format `rst-<userId>-<dayOfMonth>`
- **Exploitation:** Compute `rst-1-<today's day>` for the admin (id 1) and post
  a new password to `/reset` without ever seeing an email.
- **Business impact:** Full account takeover of any account, including admin.

### A5. Role Tampering via Session Cookie
- **OWASP:** A07 / A01 — Broken authentication & access control (CWE-565)
- **Location:** the `hlx` cookie (base64 JSON: `uid`, `role`, `tier`, `sid`)
- **Exploitation:** Decode the cookie, change `"role":"customer"` to
  `"role":"admin"`, re-encode, reload. `/admin` and `/admin/inbox` open — the
  server trusts the cookie's role claim instead of its own records.
- **Business impact:** Full admin compromise by any registered user.

### A6. No Password Policy at Registration *(new)*
- **OWASP:** A07 — Authentication Failures (CWE-521)
- **Location:** `POST /register`
- **Exploitation:** Register with a two-character password. It is accepted —
  there is no length or complexity check anywhere in the flow.
- **Business impact:** Accounts protected by trivially guessable passwords.

## Search & Catalogue (3)

### S1. SQL Injection in Product Search *(new)*
- **OWASP:** A03 — Injection (CWE-89)
- **Location:** `GET /search?q=`
- **Exploitation:** Search `' OR '1'='1` — the string-built filter becomes
  always-true and returns the **entire** catalogue, including Private Sale
  pieces hidden from non-VIPs.
- **Business impact:** Whole-catalogue (and, in real deployments, whole-table)
  extraction, plus a broken VIP wall.

### S2. Reflected XSS in Search *(new)*
- **OWASP:** A03 — Injection / Reflected XSS (CWE-79)
- **Location:** `GET /search?q=`
- **Exploitation:** The search term is reflected into the results page
  unencoded: `<script>alert(1)</script>` or an `<img onerror>` payload
  executes for whoever opens the crafted search link.
- **Business impact:** Session theft and actions-as-victim under the brand's
  own domain.

### S3. Private-Sale Broken Access Control
- **OWASP:** A01 — Broken Access Control (CWE-862)
- **Location:** `GET /product/:id`, `POST /cart/add`
- **Exploitation:** As a non-VIP (Lena), browse the catalogue — Private Sale
  pieces are hidden. Request one directly (`/product/4`): it renders fully;
  add to cart and check out. Neither route checks membership.
- **Business impact:** "Members-only" inventory sold to anyone who guesses an
  ID — exclusivity and waitlist economics collapse.

## VIP Membership (2)

### V1. VIP Tier Bypass via Mass Assignment
- **OWASP:** API3 / A01 — Mass assignment (CWE-915)
- **Location:** `POST /profile`
- **Exploitation:** Intercept the profile save (or edit the "readonly" tier
  input) and set `tier=Platinum`. The server applies every posted field and
  refreshes the session cookie.
- **Business impact:** Anyone self-upgrades to the top tier — Private Sale
  exclusivity destroyed, tier discounts given away.

### V2. Tier-Price Manipulation (Client-Supplied Discount %)
- **OWASP:** A04 — Business Logic (CWE-472)
- **Location:** `POST /checkout` (`tierDiscount` field)
- **Exploitation:** The "your tier discount %" value is a form field. Set it
  to `95` (as a Member whose real discount is 0); the server applies it.
  Stacks with coupons and tampered prices.
- **Business impact:** Near-free purchases that look like legitimate VIP
  transactions in the order book.

## Cart & Checkout (3)

### C1. Price Tampering at Checkout
- **OWASP:** A04 — Business Logic (CWE-472)
- **Location:** `POST /checkout` (`price_<i>` fields)
- **Exploitation:** Edit the unit-price inputs at checkout (e.g. `18500` →
  `1`) before submitting. The server charges the client-supplied price.
- **Business impact:** A $64,000 tourbillon bought for $1 — direct revenue
  theft.

### C2. Checkout Line Forgery — Cart Never Verified *(new)*
- **OWASP:** A04 — Business Logic (CWE-472)
- **Location:** `POST /checkout` (`pid_<i>`, `qty_<i>` fields)
- **Exploitation:** The server never compares the posted lines with your
  actual server-side cart. Put 1 item in the cart, then check out with
  `qty_0=5` — or a `pid` that was never in the cart. The order is created
  exactly as posted.
- **Business impact:** Stock checks, purchase limits and per-customer
  restrictions are silently bypassed.

### C3. Coupon Reuse Without Limit
- **OWASP:** A04 — Business Logic (CWE-799)
- **Location:** `POST /checkout` (`coupon` field)
- **Exploitation:** Use `LUXE10` or `BIENVENUE15` on every order, forever —
  no per-user or global redemption tracking; stacks with the tier discount.
- **Business impact:** A leaked "one-time" code becomes a permanent 10–15%
  margin leak.

## Orders & Certificates (4)

### O1. Order IDOR
- **OWASP:** A01 — BOLA (CWE-639)
- **Location:** `GET /order/:id`
- **Exploitation:** As Lena, open `/order/1` — Arif's order, with his name,
  email, items and prices. Increment the id to read every order.
- **Business impact:** Complete purchase-history leak of the clientele.

### O2. Certificate IDOR
- **OWASP:** A01 — BOLA (CWE-639)
- **Location:** `GET /certificate/:id`
- **Exploitation:** Certificates render for any logged-in user, including other
  customers' — with the owner's email and purchase details. No ownership
  check.
- **Business impact:** Ownership records of high-value pieces leak — a
  shopping list for thieves.

### O3. Certificate Forgery — Format-Trusting Verifier
- **OWASP:** A04 — Insecure Design (CWE-338)
- **Location:** `GET /verify?cert=`, serials issued at checkout
- **Exploitation:** Serials are sequential (`HLX-1001`, …). Verify
  `HLX-1742` — never issued. The verifier checks only the *format* and range,
  and declares it **GENUINE**.
- **Business impact:** Counterfeiters "authenticate" fake goods on the brand's
  own verification page — the core trust promise is broken.

### O4. Certificate Registry Enumeration *(new)*
- **OWASP:** A01 — Broken Access Control (CWE-359 / enumeration)
- **Location:** `GET /verify?cert=` (no rate limit, sequential serials)
- **Exploitation:** Probe serials one after another — `HLX-1001`, `1002`, … —
  and map the whole registry. The lab marks this after 5 distinct serials are
  probed inside a minute.
- **Business impact:** Full registry reconnaissance for theft, fraud and
  targeted phishing.

## Profile & Settings (2)

### P1. CSRF on Profile Change
- **OWASP:** A01 — Cross-Site Request Forgery (CWE-352)
- **Location:** `POST /profile` (no anti-CSRF token, cookie session, no SameSite)
- **Exploitation:** Host a page with an auto-submitting form posting to
  `http://127.0.0.1:3013/profile`. A logged-in victim who visits is silently
  changed — combine with V1 to also rewrite the tier.
- **Business impact:** Account-profile tampering primitive needing no
  password.

### P2. Unrestricted File Upload (Profile Photo)
- **OWASP:** A04 / A03 — Unrestricted Upload of Dangerous Type (CWE-434)
- **Location:** `POST /profile/photo`, served from `GET /uploads/<name>`
- **Exploitation:** Upload `x.html` containing HTML/JS as your "photo". It is
  stored and served back as `text/html` — a stored-XSS page on the store's
  own origin. No type, size or content validation.
- **Business impact:** Phishing/XSS content hosted under the brand's domain.

## Concierge (1)

### M1. Stored XSS in Concierge Message
- **OWASP:** A03 — Injection / Stored XSS (CWE-79)
- **Location:** `POST /concierge` → rendered raw in `GET /admin/inbox`
- **Exploitation:** Send `<script>alert(document.cookie)</script>` (or an
  `<img onerror>` payload). When the admin opens the inbox, it executes in
  their browser.
- **Business impact:** Admin session hijacking via the support channel
  itself.

## Admin Panel (1)

### D1. CSRF on Admin Action — State-Changing GET *(new)*
- **OWASP:** A01 — Cross-Site Request Forgery (CWE-352)
- **Location:** `GET /admin/inbox/delete?id=` (no token, no confirmation)
- **Exploitation:** The inbox delete is a plain GET link. An
  `<img src="http://127.0.0.1:3013/admin/inbox/delete?id=1">` on any page an
  admin views deletes the message.
- **Business impact:** Attackers erase the concierge evidence trail (or worse
  in richer panels) with zero clicks from the victim.

## Platform & Data (1)

### X1. Excess Data Exposure — Full VIP Member List
- **OWASP:** API3 — Excessive Data Exposure (CWE-200)
- **Location:** `GET /api/members` (no authentication at all)
- **Exploitation:** Open `/api/members` logged out. It returns every member's
  name, email, phone, tier, role and lifetime spend.
- **Business impact:** A ready-made spear-phishing and burglary target list
  of wealthy clients, plus a serious privacy/GDPR breach.
