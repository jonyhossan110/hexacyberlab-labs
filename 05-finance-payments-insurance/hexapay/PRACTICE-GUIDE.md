# HexaPay — Practice Guide (LAB 41)

Challenges grouped by feature, then difficulty. Try each one yourself first — the Lab Coach unlocks step-by-step help for a feature after **3 genuine attempts** on it. Every challenge has a measurable objective: it is scored only when the exploit's real effect happens on the server.

## Login & Authentication

### SQL Injection Login Bypass — Beginner
- **Where:** `POST /login` · **OWASP:** A03:2021 – Injection
- **Objective:** Log in without knowing any real password, by injecting into the login query.
- **Hints:**
  1. The gateway still runs a legacy login that builds its query by gluing your input straight into the SQL string.
  2. Try a classic tautology in the email field — something that makes the WHERE clause always true.
  3. Use admin@hexapay.local' OR '1'='1' -- as the email and any password.

### Brute Force — No Rate Limiting — Beginner
- **Where:** `POST /login` · **OWASP:** A07:2021 – Identification and Authentication Failures
- **Objective:** Get 10 failed logins for one account processed with no lockout or throttling.
- **Hints:**
  1. Nothing slows you down when a login fails. No lockout, no delay, no CAPTCHA.
  2. Script 10 wrong passwords for one account and watch every attempt get processed.
  3. The 10th consecutive failure is still answered instantly — that missing throttle is the flaw.

### User Enumeration via Login & Reset Responses — Beginner
- **Where:** `POST /login, POST /forgot` · **OWASP:** A07:2021 – Identification and Authentication Failures
- **Objective:** Prove the gateway reveals whether an email is registered, from differing error messages.
- **Hints:**
  1. Compare the error for an email that exists with one that does not.
  2. “No account found” vs “Incorrect password” tells you exactly which emails are registered.
  3. The forgot-password page leaks the same way. Collect both response types to prove it.

### Default Platform Admin Credentials — Beginner
- **Where:** `POST /login (platform admin account)` · **OWASP:** A07:2021 – Identification and Authentication Failures
- **Objective:** Log in as the platform admin using shipped default credentials.
- **Hints:**
  1. The platform admin account shipped with the product was never changed.
  2. Docs, installers and defaults lists all point at the same classic pair: admin@… / admin123.
  3. Try admin@hexapay.local with the most common default password in the world.

### Predictable Password Reset Token — Intermediate
- **Where:** `POST /forgot, POST /reset` · **OWASP:** A07:2021 – Identification and Authentication Failures
- **Objective:** Reset another account’s password using a token you computed yourself, never issued to you.
- **Hints:**
  1. Request a reset for your own account and look closely at the token format.
  2. The token is built only from things an attacker knows: the user id and today’s date.
  3. Guess the token for a different account — rst-<userid>-<DDMM> — without ever requesting a reset for it.

### Session Cookie Role Tampering — Intermediate
- **Where:** `GET /admin (session cookie)` · **OWASP:** A01:2021 – Broken Access Control
- **Objective:** Reach the platform admin panel by editing the role inside your own session cookie.
- **Hints:**
  1. Your session cookie is just base64 JSON. Decode it and see what it claims about you.
  2. The /admin page trusts the role written inside the cookie instead of the account record.
  3. Change "role":"staff" to "role":"admin" in the cookie, re-encode, and visit /admin.

## Registration & Profile

### Weak Password Policy at Registration — Beginner
- **Where:** `POST /register` · **OWASP:** A07:2021 – Identification and Authentication Failures
- **Objective:** Create an account protected by a one-character password.
- **Hints:**
  1. Register a new merchant and see how short a password you can get away with.
  2. There is no length or complexity check at all.
  3. A one-character password is accepted.

### Stored XSS in Business Name — Beginner
- **Where:** `POST /register, POST /settings (business name rendered on dashboard & admin list)` · **OWASP:** A03:2021 – Injection
- **Objective:** Store a script payload in the business name so it is saved and rendered as code.
- **Hints:**
  1. Your business name is printed back on the dashboard and in the admin merchant list — unescaped.
  2. Put an HTML/JS payload in the business name at signup or in Settings.
  3. <script>alert(1)</script> or <img src=x onerror=alert(1)> as the business name is stored raw.

### CSRF on Profile Update — Beginner
- **Where:** `POST /settings` · **OWASP:** A01:2021 – Broken Access Control
- **Objective:** Change a victim’s profile settings with a cross-site request that carries no CSRF protection.
- **Hints:**
  1. The settings form changes your contact email and business name with no anti-CSRF token.
  2. The app sets an hx_origin marker cookie on its own pages; the settings handler never checks it.
  3. Send the settings POST from “another site” (no marker cookie / foreign Origin) while logged in — it still applies.

### Mass Assignment — Role & Balance at Registration — Intermediate
- **Where:** `POST /register` · **OWASP:** A01:2021 – Broken Access Control
- **Objective:** Register an account that is born an admin, or born with a large balance, by submitting unlisted fields.
- **Hints:**
  1. The signup handler copies every submitted field straight onto the new account.
  2. Add fields the form never showed you — the data model has role and balance fields.
  3. Register with role=admin (or balance=99999) as extra form fields and see what your new account owns.

## Checkout & Payment Links

### Checkout Amount Tampering — Beginner
- **Where:** `POST /checkout/:linkId` · **OWASP:** A04:2021 – Insecure Design
- **Objective:** Complete a checkout for far less than the payment link’s real price.
- **Hints:**
  1. The hosted checkout page shows the real price — but the POST includes an amount field.
  2. The gateway trusts the amount the browser sends instead of the link’s stored price.
  3. Pay a $250 link with amount=1 and watch the merchant get credited for a “paid” order.

### Cross-Merchant Payment Link Editing (IDOR) — Beginner
- **Where:** `POST /links/:id/update` · **OWASP:** A01:2021 – Broken Access Control
- **Objective:** Modify or deactivate a payment link that belongs to a different merchant.
- **Hints:**
  1. Payment link ids are predictable (L-1001, L-2001…). The edit handler checks you are logged in — nothing more.
  2. Try editing the OTHER merchant’s link: change its price or deactivate it.
  3. No ownership check stands between you and a competitor’s checkout.

### Currency Confusion at Checkout — Intermediate
- **Where:** `POST /checkout/:linkId` · **OWASP:** A04:2021 – Insecure Design
- **Objective:** Settle a USD payment link in a different currency while the merchant is credited the full USD number.
- **Hints:**
  1. The checkout accepts a currency parameter and never reconciles it with the link’s currency.
  2. The merchant is credited the numeric amount as if it were USD either way.
  3. Pay a $120 USD link with currency set to a near-worthless unit — the books still show 120 USD in.

### Negative Quantity Accepted at Checkout — Intermediate
- **Where:** `POST /checkout/:linkId` · **OWASP:** A04:2021 – Insecure Design
- **Objective:** Create a paid transaction with a negative total by submitting a negative quantity.
- **Hints:**
  1. Quantity is multiplied straight into the total with no sanity check.
  2. What happens when qty is not 1, or 2 — but below zero?
  3. POST qty=-2: the gateway creates a “paid” transaction with a negative total.

## Transactions & Receipts

### Cross-Merchant Transaction Details (IDOR) — Beginner
- **Where:** `GET /transactions/:id` · **OWASP:** A01:2021 – Broken Access Control
- **Objective:** Read full details of a transaction owned by another merchant.
- **Hints:**
  1. Transaction ids are sequential numbers — walk them.
  2. The details page never asks which merchant the transaction belongs to.
  3. Open a transaction id from the other merchant’s range and read their customer’s payment.

### Cross-Merchant Receipt Access (IDOR) — Beginner
- **Where:** `GET /receipts/:id` · **OWASP:** A01:2021 – Broken Access Control
- **Objective:** Download a payment receipt belonging to another merchant’s customer.
- **Hints:**
  1. Receipts live at their own predictable URL, separate from the transaction page.
  2. Fixing the transaction page is not enough if the receipt route was forgotten.
  3. Fetch a receipt for the other merchant’s transaction id.

## Refunds

### Refund Exceeds the Original Payment — Beginner
- **Where:** `POST /transactions/:id/refund` · **OWASP:** A04:2021 – Insecure Design
- **Objective:** Refund more money than a transaction originally collected.
- **Hints:**
  1. The refund form asks for an amount. Nothing compares it with what was actually paid.
  2. Refund more than the transaction total and see if the gateway blinks.
  3. A $250 payment happily refunds $300 — money from nowhere.

### Refund Another Merchant's Transaction — Beginner
- **Where:** `POST /transactions/:id/refund` · **OWASP:** A01:2021 – Broken Access Control
- **Objective:** Book a refund against a transaction owned by a different merchant.
- **Hints:**
  1. You already know transaction ids are sequential and readable cross-merchant.
  2. The refund endpoint is just as trusting as the read endpoints.
  3. Refund a small amount from the OTHER merchant’s transaction and watch their balance drop.

### Double Refund on a Fully Refunded Payment — Intermediate
- **Where:** `POST /transactions/:id/refund` · **OWASP:** A04:2021 – Insecure Design
- **Objective:** Refund an already fully-refunded transaction a second time.
- **Hints:**
  1. Transaction 1005 is already refunded in full — its status says so.
  2. Does the refund endpoint check the status, or the already-refunded total, at all?
  3. Refund it again. Then again. The balance keeps dropping.

## Webhooks

### Webhook Signing Secret Exposed to Staff Role — Beginner
- **Where:** `GET /api/webhooks/config` · **OWASP:** A01:2021 – Broken Access Control
- **Objective:** Read the merchant’s webhook signing secret using a low-privilege staff account.
- **Hints:**
  1. The webhook config API returns the endpoint details — including the signing secret.
  2. It answers any logged-in user of the merchant, not just the owner.
  3. Log in as a staff account and ask the API for the config.

### Forged Webhook Event — No Signature Verification — Intermediate
- **Where:** `POST /webhooks/receive` · **OWASP:** A08:2021 – Software and Data Integrity Failures
- **Objective:** Get a self-invented payment event accepted and credited, with an invalid signature.
- **Hints:**
  1. The gateway accepts inbound “payment.succeeded” events from its processor at /webhooks/receive.
  2. Real processors sign events with HMAC. This endpoint never checks the signature header.
  3. POST your own payment.succeeded event with a made-up signature and a fat amount — the balance still moves.

## API & API Keys

### Publishable Key Accepted on Secret Endpoints — Beginner
- **Where:** `GET /api/balance` · **OWASP:** A07:2021 – Identification and Authentication Failures
- **Objective:** Read protected account data (the balance) using only the public publishable key.
- **Hints:**
  1. Publishable keys (pk_…) are meant to be public — they sit in web page source by design.
  2. Some API endpoints accept ANY known key as a Bearer token, publishable included.
  3. Ask /api/balance for the balance using only the pk_ key anyone can scrape.

### Read-Only API Key Can Create Charges — Intermediate
- **Where:** `POST /api/charges` · **OWASP:** A01:2021 – Broken Access Control
- **Objective:** Create a real charge using an API key whose scope is read-only.
- **Hints:**
  1. Merchants get separate keys: a read-only secret and a write secret. Least privilege — in theory.
  2. The charges endpoint checks that a key exists, not what the key may do.
  3. Create a charge with the read-only key (sk_…_read) as the Bearer token.

## Payouts & Balance

### Payout Exceeds Available Balance — Beginner
- **Where:** `POST /payouts` · **OWASP:** A04:2021 – Insecure Design
- **Objective:** Book a payout larger than the merchant’s available balance.
- **Hints:**
  1. The payout handler subtracts first and never asks whether the balance covers it.
  2. Ask for more than the merchant owns.
  3. A payout of 999999 is accepted and the balance simply goes negative.

### Payout Destination Changed at Request Time — Intermediate
- **Where:** `POST /payouts` · **OWASP:** A04:2021 – Insecure Design
- **Objective:** Send a payout to a bank account that is not the merchant’s saved payout account.
- **Hints:**
  1. Your saved payout bank account is on file — but the payout form lets the request itself carry an IBAN.
  2. The gateway pays wherever the request says, no re-verification, no cooling-off period.
  3. Request a small payout with someone else’s IBAN in the iban field.

## Platform & Admin

### Debug Endpoint Exposes Secrets & Passwords — Beginner
- **Where:** `GET /debug` · **OWASP:** A05:2021 – Security Misconfiguration
- **Objective:** Open the leftover debug endpoint and read the platform’s secrets in plain text.
- **Hints:**
  1. A diagnostics page from development was left switched on in production.
  2. It dumps the whole in-memory state: users, passwords, API keys, webhook secrets.
  3. Just open /debug while the lab is unlocked.
