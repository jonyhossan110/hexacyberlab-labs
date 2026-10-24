# HexaLuxury — Practice Guide (Lab 5)

Every challenge below is a **tracked test** in the lab: it completes
automatically when your exploit genuinely succeeds, and raises your progress
toward 100%. The **Mission page (`/tests`)** in the running lab mirrors this
guide and reveals the same hints one at a time. The **Lab Assistant** chatbot
gives step-by-step help for a feature only after you have tried that feature
at least **3 times** — that rule is deliberate.

**Setup:** `node server.js` → http://127.0.0.1:3013 — first, unlock the lab
with the completion key from Lab 4.
**Main attack account:** Lena (`lena@hexaluxury.local` / `User@123`, Member)
**Control account:** Arif (`arif@hexaluxury.local` / `User@123`, Platinum)
**Admin:** `admin@hexaluxury.local` / `Admin@123`
Restarting the server resets the business data; your progress (in
`progress.json`) survives restarts.

---

## Login & Authentication

### Beginner — Account Enumeration via Password Reset
- **Objective:** Show two different `/forgot` responses: one for
  `lena@hexaluxury.local`, one for an invented email — and state what the
  difference lets an attacker do.
- **Hints:** ① Compare the forgot-password answer for a real email and an
  invented one. ② The page answers the two cases very differently.
  ③ Try `ghost@nowhere.local` at `/forgot`.
- **Maps to:** Test `user-enumeration` · VULNERABILITIES A3.

### Beginner — No Brute-Force Protection
- **Objective:** Ten consecutive failed logins for one account, all processed
  with no slowdown, lockout or challenge (evidence: your attempt log).
- **Hints:** ① How many wrong passwords can you try in a row? ② Nothing
  changes between failure #1 and failure #10. ③ Script ten failed logins for
  `kenji@hexaluxury.local`.
- **Maps to:** Test `brute-force` · A2.

### Beginner — No Password Policy
- **Objective:** Create a working account whose password is 3 characters or
  shorter, and log in with it.
- **Hints:** ① What is the shortest password the register form accepts?
  ② Try two characters. ③ There is no check at all.
- **Maps to:** Test `weak-password` · A6.

### Intermediate — SQL Injection Login Bypass
- **Objective:** Reach an account (you will land as the admin) without
  knowing any password, using only the login form.
- **Hints:** ① The login runs through a legacy query builder that
  concatenates strings. ② A quote, the word OR, and a comment marker change
  the query's meaning. ③ Email: `' OR '1'='1' -- ` (trailing space), any
  password.
- **Maps to:** Test `sqli-login` · A1.

### Intermediate — Predictable Password-Reset Token
- **Objective:** Set a new password for an account you do not own (use a
  throwaway account you registered — or the admin) without any inbox access.
- **Hints:** ① Request a reset and study the token's structure. ② It is built
  from two pieces of public information: who you are, and what day it is.
  ③ Format: `rst-<userId>-<dayOfMonth>`; the admin is id 1.
- **Maps to:** Test `reset-token` · A4.

### Intermediate — Role Tampering via Session Cookie
- **Objective:** Reach `/admin` and the concierge inbox as Lena. Evidence:
  the dashboard revenue figure.
- **Hints:** ① Your identity travels in the `hlx` cookie — what format is it?
  ② It decodes to JSON, and the server believes its role claim. ③ Decode
  (base64), set `"role":"admin"`, re-encode, reload `/admin`.
- **Maps to:** Test `cookie-role` · A5.

## Search & Catalogue

### Beginner — Reflected XSS in Search
- **Objective:** A search URL whose payload appears unencoded in the results
  page (evidence: page source or an alert in your browser).
- **Hints:** ① Your search term is echoed onto the results page. ② Is it
  echoed as text, or as HTML? ③ Search an `<img onerror>` payload and view
  source.
- **Maps to:** Test `search-xss` · S2.

### Beginner — Private-Sale Broken Access Control
- **Objective:** As Lena, open a Private Sale product page (e.g. #4) in full
  and add it to the cart.
- **Hints:** ① The catalogue hides VIP pieces; hiding is not checking.
  ② Pieces have predictable numeric URLs. ③ Open `/product/4` directly.
- **Maps to:** Test `private-sale` · S3.

### Intermediate — SQL Injection in Product Search
- **Objective:** As a Member (or logged out), make search return a Private
  Sale piece it would normally filter out.
- **Hints:** ① The search filter is built by string concatenation, like the
  old login. ② A classic tautology makes the filter always true. ③ Search
  `' OR '1'='1` and look at which pieces appear.
- **Maps to:** Test `search-sqli` · S1.

## VIP Membership

### Beginner — Tier Bypass via Mass Assignment
- **Objective:** As Lena, make the header show "Platinum" and the Private
  Sale collection appear — without paying or admin help.
- **Hints:** ① Your tier sits in a field the team "sets" on `/profile`.
  ② Readonly in the browser is not readonly on the server. ③ Intercept
  `POST /profile` and add `tier=Platinum`.
- **Maps to:** Test `tier-mass-assignment` · V1.

### Intermediate — Tier-Price Manipulation
- **Objective:** Complete a checkout where the applied tier discount is
  higher than your real tier allows (evidence: order total maths).
- **Hints:** ① At checkout, look at how your tier discount is submitted.
  ② Your discount % travels as an editable form field. ③ Set
  `tierDiscount` to `95`.
- **Maps to:** Test `tier-discount` · V2.

## Cart & Checkout

### Beginner — Price Tampering
- **Objective:** Complete a checkout charged below catalogue price *without*
  a coupon (evidence: the order page total).
- **Hints:** ① Inspect the checkout form's fields before submitting.
  ② Unit prices are input fields, not facts. ③ Change `price_0` to `1`.
- **Maps to:** Test `price-tamper` · C1.

### Beginner — Coupon Reuse Without Limit
- **Objective:** Two separate completed orders, both discounted by the same
  code (`BIENVENUE15` or `LUXE10`); explain in one sentence why the store
  cannot tell.
- **Hints:** ① What state does the server keep about redemptions? ② None —
  just do it twice. ③ Stacking with a tier discount is a bonus.
- **Maps to:** Test `coupon-reuse` · C3.

### Intermediate — Checkout Line Forgery
- **Objective:** An order whose items/quantities do not match what was in
  your cart (evidence: order page vs cart page).
- **Hints:** ① Checkout posts `pid` and `qty` fields per line. ② Does the
  server ever compare them with your actual cart? ③ Cart 1 item, check out
  with `qty_0=5` — or a `pid` never carted.
- **Maps to:** Test `line-forgery` · C2.

## Orders & Certificates

### Beginner — Order IDOR
- **Objective:** As Lena, display Arif's order #1 and record the buyer's
  email shown on it.
- **Hints:** ① Orders live behind predictable numeric URLs. ② My Account
  shows *your* orders — the URL does not care whose they are. ③ Open
  `/order/1`.
- **Maps to:** Test `order-idor` · O1.

### Beginner — Certificate IDOR
- **Objective:** As Lena, open a certificate that belongs to another
  customer (one issued after a purchase) and record the owner's email.
- **Hints:** ① Certificates live at `/certificate/<id>`, ids sequential.
  ② Buying issues a certificate to the buyer — ids keep counting up.
  ③ Have Arif buy something, then open his newest certificate's id as Lena.
- **Maps to:** Test `cert-idor` · O2.

### Intermediate — Certificate Forgery
- **Objective:** Get `/verify` to declare a serial of your choosing — one
  never issued — **GENUINE** (evidence: screenshot).
- **Hints:** ① Look at the serial format on any product page. ② What is the
  verifier checking — existence, or shape? ③ Try `HLX-1742`.
- **Maps to:** Test `cert-forgery` · O3.

### Intermediate — Certificate Registry Enumeration
- **Objective:** Probe at least 5 distinct serials within a minute and
  describe how the whole registry could be mapped.
- **Hints:** ① Serials are sequential and `/verify` has no rate limit.
  ② Probe several different serials in a row and watch the answers.
  ③ `HLX-1001`…`HLX-1005` back to back.
- **Maps to:** Test `cert-enumeration` · O4.

## Profile & Settings

### Intermediate — CSRF on Profile Change
- **Objective:** A page on another origin that, when opened by a logged-in
  user, silently changes that user's profile. For the lab detection, the
  state change must arrive with a cross-site Origin/Referer (as a real
  attack sends).
- **Hints:** ① Look for what's missing from the profile form that a bank's
  form would have. ② Same-origin policy does not stop forms from *sending*.
  ③ Auto-submitting form → `http://127.0.0.1:3013/profile`.
- **Maps to:** Test `csrf-profile` · P1.

### Intermediate — Unrestricted File Upload
- **Objective:** A "profile photo" that renders HTML you control when opened
  (evidence: the `/uploads/…` URL showing your content).
- **Hints:** ① The form says "photo" — what does it actually check? ② Try a
  file whose extension is not an image at all. ③ Upload `x.html`, open
  `/uploads/x.html`.
- **Maps to:** Test `file-upload` · P2.

## Concierge

### Intermediate — Stored XSS in Concierge Message
- **Objective:** A concierge message that executes JavaScript when the admin
  opens the inbox (demonstrate as the admin in a second browser).
- **Hints:** ① Your message is stored, then read by someone powerful.
  ② Compare how your name renders in My Account (escaped) with how inbox
  messages render. ③ Send `<script>alert(document.cookie)</script>`.
- **Maps to:** Test `concierge-xss` · M1.

## Admin Panel

### Intermediate — CSRF on Admin Action (State-Changing GET)
- **Objective:** Delete a concierge message *without* clicking anything in
  the inbox UI — e.g. by loading an image URL while logged in as admin.
- **Hints:** ① The inbox delete is triggered how? ② It is a plain GET link —
  no token, no confirmation. ③ `<img src="…/admin/inbox/delete?id=1">` on
  any page an admin views.
- **Maps to:** Test `admin-csrf` · D1.

## Platform & Data

### Beginner — Excess Data Exposure
- **Objective:** Retrieve the JSON member list (emails, phones, spend)
  **without logging in**. Save the response as evidence.
- **Hints:** ① Stores often expose helper endpoints. ② Where might a
  "members" API live? ③ `/api/members`, private window.
- **Maps to:** Test `members-exposure` · X1.

---

## Capstone (Advanced, ungraded)

### Full VIP fraud chain
Starting as Lena in a fresh browser, end with: Platinum tier, a Private Sale
piece bought at ≥90% below list price, and a "genuine" certificate story —
chaining at least four distinct tests. Write it as a short incident report:
step → flaw → business impact. (Tests: V1 + S3 + C1/V2 + C3 + O3.)

### Defender round
Pick any three tests, implement the fixes from `FIX-AND-RETEST.md` in a copy
of `server.js`, and show the original exploits now failing while the normal
business flows still work (regression output attached).
