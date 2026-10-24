# HexaPay — Vulnerability Map (LAB 41)

The complete scored registry: **26 tests across 9 features**. Every entry is a real, working flaw in this build, detected server-side when the exploit actually succeeds.

## Login & Authentication (6)

### SQL Injection Login Bypass
- **OWASP:** A03:2021 – Injection · **Difficulty:** Beginner · **Where:** `POST /login`
- **Exploitation outline:** Go to /login. In the email field type: admin@hexapay.local' OR '1'='1' -- and any password. Submit. The legacy query becomes always-true and you are logged in as the platform admin without the password.
- **Impact:** On a real payment gateway this is full account takeover with no password at all — the attacker lands in the first account the query returns, often an admin.
- **Report as:** "SQL Injection in Authentication" — Critical. Fix: Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.

### Brute Force — No Rate Limiting
- **OWASP:** A07:2021 – Identification and Authentication Failures · **Difficulty:** Beginner · **Where:** `POST /login`
- **Exploitation outline:** Pick one account, e.g. maya@novashop.test. Send 10 login attempts with wrong passwords (curl loop or Burp Intruder). Every failure is processed normally; on the 10th the test flips — the gateway never throttles you.
- **Impact:** Attackers run credential-stuffing lists against gateways like this every day. One reused password and a merchant account — with its balance and payouts — is gone.
- **Report as:** "Missing Brute-Force Protection on Login" — High. Fix: Add per-account and per-IP rate limiting, progressive delays and lockout with alerting.

### User Enumeration via Login & Reset Responses
- **OWASP:** A07:2021 – Identification and Authentication Failures · **Difficulty:** Beginner · **Where:** `POST /login, POST /forgot`
- **Exploitation outline:** POST /login with an existing email (maya@novashop.test) and a wrong password → “Incorrect password”. POST again with a fake email (nobody@nowhere.test) → “No account found”. The two different answers enumerate accounts; both sightings flip the test.
- **Impact:** Enumeration turns random phishing into a aimed hit-list of real merchant accounts — the first step of almost every account-takeover campaign.
- **Report as:** "Account Enumeration via Authentication Responses" — Medium. Fix: Return one generic error (“invalid credentials”) for every failed login and reset request.

### Default Platform Admin Credentials
- **OWASP:** A07:2021 – Identification and Authentication Failures · **Difficulty:** Beginner · **Where:** `POST /login (platform admin account)`
- **Exploitation outline:** On /login use email admin@hexapay.local and password admin123. You land in the platform admin account — the shipped defaults were never changed.
- **Impact:** A platform admin on a payment gateway sees every merchant, every key and every balance. Default creds here mean total platform compromise.
- **Report as:** "Default Credentials on Administrative Account" — Critical. Fix: Force a password change at first login; disable or rename default accounts; scan for defaults in deployment checks.

### Predictable Password Reset Token
- **OWASP:** A07:2021 – Identification and Authentication Failures · **Difficulty:** Intermediate · **Where:** `POST /forgot, POST /reset`
- **Exploitation outline:** User ids: maya=2, leo=3, ivan=4, sara=5. The token formula is rst-<id>-<DDMM> with today’s date, e.g. rst-5-2310 on Oct 23. POST /reset with sara@pixelmart.test, your guessed token and a new password — no reset email was ever requested, yet it works. Log in as sara with the new password.
- **Impact:** Anyone can take over any merchant account — including the payout settings — just by knowing an email address and the date.
- **Report as:** "Predictable Password Reset Token" — High. Fix: Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, single use.

### Session Cookie Role Tampering
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate · **Where:** `GET /admin (session cookie)`
- **Exploitation outline:** Log in as leo@novashop.test (staff). Copy the hxpay_sess cookie, base64-decode it, change "role":"staff" to "role":"admin", base64-encode again and replace the cookie. Visit /admin — the gateway trusts the cookie and opens the platform panel.
- **Impact:** A low-privilege staff account becomes platform admin in seconds — every merchant’s money flows are then one click away.
- **Report as:** "Client-Side Authorization Data in Session Cookie" — High. Fix: Keep roles server-side in the session store; sign or encrypt client cookies; never trust client-supplied roles.

## Registration & Profile (4)

### Weak Password Policy at Registration
- **OWASP:** A07:2021 – Identification and Authentication Failures · **Difficulty:** Beginner · **Where:** `POST /register`
- **Exploitation outline:** Go to /register and create a merchant with password “a”. The account is created — the gateway never asked for length or complexity.
- **Impact:** Weak merchant passwords plus no brute-force protection means accounts fall to the first password list an attacker tries.
- **Report as:** "No Password Complexity Requirements" — Medium. Fix: Enforce a minimum length (≥12) and breached-password screening at registration and password change.

### Mass Assignment — Role & Balance at Registration
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate · **Where:** `POST /register`
- **Exploitation outline:** POST /register with the normal fields PLUS role=admin (or balance=99999). The handler binds everything: your new account is a platform admin / starts with a fake balance. Log in and check.
- **Impact:** Attackers mint admin accounts — or accounts pre-loaded with spendable balance — directly from the public signup form.
- **Report as:** "Mass Assignment in Registration" — High. Fix: Allow-list bindable fields per endpoint; set role/balance server-side only; reject unexpected properties.

### Stored XSS in Business Name
- **OWASP:** A03:2021 – Injection · **Difficulty:** Beginner · **Where:** `POST /register, POST /settings (business name rendered on dashboard & admin list)`
- **Exploitation outline:** Register (or edit Settings) with business name: <img src=x onerror=alert(1)>. It is stored verbatim and rendered unescaped on the dashboard and the admin merchant list.
- **Impact:** The payload fires in the platform admin’s browser when they review merchants — session theft and admin actions from the victim’s own browser.
- **Report as:** "Stored Cross-Site Scripting in Business Name" — High. Fix: Context-encode all user-controlled output; add a Content-Security-Policy as defence in depth.

### CSRF on Profile Update
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Beginner · **Where:** `POST /settings`
- **Exploitation outline:** While logged in, POST /settings with new values but WITHOUT the hx_origin marker cookie (e.g. curl with only the session cookie, or a foreign Origin header). The change applies — no token was ever checked.
- **Impact:** A merchant who visits a hostile page while logged in gets their contact email changed — the first step to hijacking password resets and payout notices.
- **Report as:** "Cross-Site Request Forgery on Profile Update" — Medium. Fix: Require per-session CSRF tokens on all state-changing requests and verify Origin/Referer as defence in depth.

## Checkout & Payment Links (4)

### Checkout Amount Tampering
- **OWASP:** A04:2021 – Insecure Design · **Difficulty:** Beginner · **Where:** `POST /checkout/:linkId`
- **Exploitation outline:** Open NovaShop’s $250 link L-1001 checkout. POST /checkout/L-1001 with amount=1. The payment succeeds, the transaction shows $1 on a $250 link and the merchant is credited.
- **Impact:** Customers check out entire carts for a dollar while the merchant’s dashboard shows a normal paid order. Pure, silent revenue theft.
- **Report as:** "Client-Side Price Tampering at Checkout" — Critical. Fix: Compute the charge amount server-side from the stored link/product; ignore any client-sent amount.

### Currency Confusion at Checkout
- **OWASP:** A04:2021 – Insecure Design · **Difficulty:** Intermediate · **Where:** `POST /checkout/:linkId`
- **Exploitation outline:** POST /checkout/L-2001 (a $120 USD link) with the correct amount but currency=HXP (or BDT). The payment settles and PixelMart is credited 120 — in USD on the books.
- **Impact:** Attackers pay in a currency worth a fraction of the dollar amount while the merchant ships goods against a “fully paid” USD order.
- **Report as:** "Missing Currency Validation at Checkout" — High. Fix: Fix the settlement currency to the link’s stored currency; convert explicitly with a rate if multi-currency is intended.

### Negative Quantity Accepted at Checkout
- **OWASP:** A04:2021 – Insecure Design · **Difficulty:** Intermediate · **Where:** `POST /checkout/:linkId`
- **Exploitation outline:** POST /checkout/L-1002 with qty=-2 and no amount override. The gateway multiplies price × -2 and records a paid transaction of -$80.
- **Impact:** Negative-total transactions corrupt balances, refunds and reports — and in real gateways have been used to pull money OUT of merchant accounts.
- **Report as:** "Missing Bounds Validation on Quantity" — High. Fix: Validate quantity as a positive integer within sensible bounds server-side; reject totals ≤ 0 for payments.

### Cross-Merchant Payment Link Editing (IDOR)
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Beginner · **Where:** `POST /links/:id/update`
- **Exploitation outline:** Log in as maya (NovaShop). POST /links/L-2001/update with a new price or active=0 — L-2001 belongs to PixelMart, but the change is applied anyway.
- **Impact:** A rival merchant rewrites your link’s price to $0 or switches it off during your biggest sale — sabotage with your own gateway’s help.
- **Report as:** "Insecure Direct Object Reference on Payment Links" — High. Fix: Enforce per-object ownership checks on every read/write; use unguessable ids as defence in depth.

## Transactions & Receipts (2)

### Cross-Merchant Transaction Details (IDOR)
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Beginner · **Where:** `GET /transactions/:id`
- **Exploitation outline:** Log in as maya. Open /transactions/1003 — that payment belongs to PixelMart, yet the full details (customer, amount, status) are served to you.
- **Impact:** Competitors and attackers harvest customer emails, amounts and purchase patterns — a privacy breach and a targeting goldmine.
- **Report as:** "Insecure Direct Object Reference on Transactions" — High. Fix: Scope every transaction query to the authenticated merchant; return 404 for foreign objects.

### Cross-Merchant Receipt Access (IDOR)
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Beginner · **Where:** `GET /receipts/:id`
- **Exploitation outline:** While logged in as maya, open /receipts/1004 — a PixelMart receipt renders in full, no ownership check anywhere.
- **Impact:** Receipts carry buyer names, emails and purchase details. Leaking them is a reportable data breach in most jurisdictions.
- **Report as:** "Insecure Direct Object Reference on Receipts" — Medium. Fix: Apply the same ownership scoping to receipt/document routes as to the primary object routes.

## Refunds (3)

### Refund Exceeds the Original Payment
- **OWASP:** A04:2021 – Insecure Design · **Difficulty:** Beginner · **Where:** `POST /transactions/:id/refund`
- **Exploitation outline:** As maya, POST /transactions/1001/refund with amount=300. The original payment was $250 — the gateway still books a $300 refund and debits the balance.
- **Impact:** Anyone with refund access — or a hijacked account — drains the merchant balance by “refunding” money that was never paid in.
- **Report as:** "Refund Amount Not Capped at Captured Amount" — Critical. Fix: Enforce cumulative refunds ≤ captured amount, server-side, inside a transaction-safe check.

### Refund Another Merchant's Transaction
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Beginner · **Where:** `POST /transactions/:id/refund`
- **Exploitation outline:** As maya, POST /transactions/1003/refund with amount=10. Transaction 1003 is PixelMart’s — the refund books anyway and PixelMart’s balance falls.
- **Impact:** A malicious merchant (or compromised account) refunds a competitor’s sales all day, draining their balance and enraging their customers.
- **Report as:** "Cross-Tenant Refund (Broken Access Control)" — Critical. Fix: Require transaction.merchantId === session merchant for refund creation; log and alert on cross-tenant attempts.

### Double Refund on a Fully Refunded Payment
- **OWASP:** A04:2021 – Insecure Design · **Difficulty:** Intermediate · **Where:** `POST /transactions/:id/refund`
- **Exploitation outline:** As ivan, POST /transactions/1005/refund with amount=10. Transaction 1005 was already refunded its full $60 — the gateway books another refund regardless.
- **Impact:** Double refunds are a classic insider and bug-abuse drain — the same sale pays out twice, three times, until someone reconciles by hand.
- **Report as:** "Missing Refund State Validation (Double Refund)" — High. Fix: Reject refunds on transactions whose refundable remainder is zero; make refund booking idempotent.

## Webhooks (2)

### Forged Webhook Event — No Signature Verification
- **OWASP:** A08:2021 – Software and Data Integrity Failures · **Difficulty:** Intermediate · **Where:** `POST /webhooks/receive`
- **Exploitation outline:** POST /webhooks/receive with JSON {"type":"payment.succeeded","merchant":"m1","amount":500} and header x-hexapay-signature: forged. NovaShop’s balance rises by $500 — the signature was never verified.
- **Impact:** Attackers credit their own merchant accounts with unlimited fake payments, then pay the money out — direct theft from the platform.
- **Report as:** "Webhook Signature Not Verified" — Critical. Fix: Verify the HMAC signature of every webhook against the endpoint secret (constant-time compare) before processing; reject failures.

### Webhook Signing Secret Exposed to Staff Role
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Beginner · **Where:** `GET /api/webhooks/config`
- **Exploitation outline:** Log in as leo@novashop.test (staff, not owner). GET /api/webhooks/config — the JSON includes the whsec_ signing secret that only the owner should ever see.
- **Impact:** A junior staff login (or phished staff account) walks away with the key that signs payment events — forged webhooks become undetectable.
- **Report as:** "Sensitive Secret Exposed to Insufficient Role" — High. Fix: Restrict secret-bearing responses to the owner role; mask secrets after creation; rotate on exposure.

## API & API Keys (2)

### Read-Only API Key Can Create Charges
- **OWASP:** A01:2021 – Broken Access Control · **Difficulty:** Intermediate · **Where:** `POST /api/charges`
- **Exploitation outline:** Take NovaShop’s read-only secret key from the API page. POST /api/charges with Authorization: Bearer <read key> and {"amount":75}. A charge is created and credited — a read key just wrote.
- **Impact:** A read-only key leaked in a dashboard or a log becomes a full payment-creation key — charges, refunds and chaos follow.
- **Report as:** "API Key Scope Not Enforced" — High. Fix: Enforce per-endpoint scope checks (read vs write) for every API key on every route.

### Publishable Key Accepted on Secret Endpoints
- **OWASP:** A07:2021 – Identification and Authentication Failures · **Difficulty:** Beginner · **Where:** `GET /api/balance`
- **Exploitation outline:** Copy NovaShop’s publishable key (pk_live_…) from the API page. GET /api/balance with Authorization: Bearer pk_live_… — the balance is returned to a key that is public by design.
- **Impact:** Every merchant’s live balance — scraped from their own checkout pages’ public keys — is exposed to the whole internet.
- **Report as:** "Publishable Key Accepted as API Credential" — High. Fix: Accept only secret keys on server-side endpoints; keep publishable keys limited to tokenising payments in the browser.

## Payouts & Balance (2)

### Payout Destination Changed at Request Time
- **OWASP:** A04:2021 – Insecure Design · **Difficulty:** Intermediate · **Where:** `POST /payouts`
- **Exploitation outline:** As maya, POST /payouts with amount=10 and iban=DE021005000000111222333 (not NovaShop’s saved IBAN). The payout is created to the foreign account immediately.
- **Impact:** One hijacked session sends the entire balance to an attacker’s IBAN. Real gateways add verification and delays precisely because of this bug.
- **Report as:** "Unverified Payout Destination Override" — Critical. Fix: Pay only to the verified on-file account; require re-authentication and a holding period for account changes.

### Payout Exceeds Available Balance
- **OWASP:** A04:2021 – Insecure Design · **Difficulty:** Beginner · **Where:** `POST /payouts`
- **Exploitation outline:** As maya, POST /payouts with amount=999999 and no iban override. It is accepted; NovaShop’s balance plunges far below zero.
- **Impact:** Merchants (or hijacked accounts) withdraw money that does not exist; the platform eats the difference at settlement.
- **Report as:** "Missing Balance Check on Payout Creation" — Critical. Fix: Check available balance (minus holds/pending) inside the same transaction that books the payout.

## Platform & Admin (1)

### Debug Endpoint Exposes Secrets & Passwords
- **OWASP:** A05:2021 – Security Misconfiguration · **Difficulty:** Beginner · **Where:** `GET /debug`
- **Exploitation outline:** Browse to /debug. The page prints all users with plain-text passwords, all API keys and all webhook secrets — leftovers from development, live in production.
- **Impact:** One URL hands an attacker every password and every signing secret on the platform — total compromise without logging in.
- **Report as:** "Debug Endpoint Exposing Sensitive Data" — Critical. Fix: Remove debug/diagnostic endpoints from production builds; gate any retained tooling behind admin auth and network restrictions.
