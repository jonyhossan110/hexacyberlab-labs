# HexaPay — Fix & Retest (LAB 41)

For every scored test: the secure implementation, and the regression check that proves the fix. Retest method: repeat the original exploit — it must now FAIL — then repeat the legitimate workflow — it must still WORK.

## Login & Authentication

### SQL Injection Login Bypass
- **Secure implementation:** Replace the string-built query with parameterised queries so credentials are compared as data.
- **Remediation (report wording):** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Log in without knowing any real password, by injecting into the login query.") — it must be rejected with no state change; then perform the normal Login & Authentication workflow as a legitimate user — it must succeed.

### Brute Force — No Rate Limiting
- **Secure implementation:** Count failures per account/IP and throttle or lock after a small threshold; add alerting.
- **Remediation (report wording):** Add per-account and per-IP rate limiting, progressive delays and lockout with alerting.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Get 10 failed logins for one account processed with no lockout or throttling.") — it must be rejected with no state change; then perform the normal Login & Authentication workflow as a legitimate user — it must succeed.

### User Enumeration via Login & Reset Responses
- **Secure implementation:** Use a single generic authentication error and identical reset responses regardless of account existence.
- **Remediation (report wording):** Return one generic error (“invalid credentials”) for every failed login and reset request.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Prove the gateway reveals whether an email is registered, from differing error messages.") — it must be rejected with no state change; then perform the normal Login & Authentication workflow as a legitimate user — it must succeed.

### Default Platform Admin Credentials
- **Secure implementation:** Force credential rotation at first run and remove vendor default accounts.
- **Remediation (report wording):** Force a password change at first login; disable or rename default accounts; scan for defaults in deployment checks.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Log in as the platform admin using shipped default credentials.") — it must be rejected with no state change; then perform the normal Login & Authentication workflow as a legitimate user — it must succeed.

### Predictable Password Reset Token
- **Secure implementation:** Issue cryptographically random, expiring, single-use reset tokens; verify against the stored issued token only.
- **Remediation (report wording):** Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, single use.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Reset another account’s password using a token you computed yourself, never issued to you.") — it must be rejected with no state change; then perform the normal Login & Authentication workflow as a legitimate user — it must succeed.

### Session Cookie Role Tampering
- **Secure implementation:** Store the session server-side with only an opaque id in the cookie; read roles from the account record per request.
- **Remediation (report wording):** Keep roles server-side in the session store; sign or encrypt client cookies; never trust client-supplied roles.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Reach the platform admin panel by editing the role inside your own session cookie.") — it must be rejected with no state change; then perform the normal Login & Authentication workflow as a legitimate user — it must succeed.

## Registration & Profile

### Weak Password Policy at Registration
- **Secure implementation:** Enforce minimum length and check new passwords against known-breached lists.
- **Remediation (report wording):** Enforce a minimum length (≥12) and breached-password screening at registration and password change.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Create an account protected by a one-character password.") — it must be rejected with no state change; then perform the normal Registration & Profile workflow as a legitimate user — it must succeed.

### Mass Assignment — Role & Balance at Registration
- **Secure implementation:** Bind only an explicit allow-list of signup fields; assign role and balance exclusively on the server.
- **Remediation (report wording):** Allow-list bindable fields per endpoint; set role/balance server-side only; reject unexpected properties.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Register an account that is born an admin, or born with a large balance, by submitting unlisted fields.") — it must be rejected with no state change; then perform the normal Registration & Profile workflow as a legitimate user — it must succeed.

### Stored XSS in Business Name
- **Secure implementation:** HTML-encode user-controlled values at render time in every context.
- **Remediation (report wording):** Context-encode all user-controlled output; add a Content-Security-Policy as defence in depth.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Store a script payload in the business name so it is saved and rendered as code.") — it must be rejected with no state change; then perform the normal Registration & Profile workflow as a legitimate user — it must succeed.

### CSRF on Profile Update
- **Secure implementation:** Add synchroniser CSRF tokens to every state-changing form and verify them server-side.
- **Remediation (report wording):** Require per-session CSRF tokens on all state-changing requests and verify Origin/Referer as defence in depth.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Change a victim’s profile settings with a cross-site request that carries no CSRF protection.") — it must be rejected with no state change; then perform the normal Registration & Profile workflow as a legitimate user — it must succeed.

## Checkout & Payment Links

### Checkout Amount Tampering
- **Secure implementation:** Always derive the payable amount from server-side catalogue data.
- **Remediation (report wording):** Compute the charge amount server-side from the stored link/product; ignore any client-sent amount.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Complete a checkout for far less than the payment link’s real price.") — it must be rejected with no state change; then perform the normal Checkout & Payment Links workflow as a legitimate user — it must succeed.

### Currency Confusion at Checkout
- **Secure implementation:** Ignore client currency; settle in the link’s currency or apply an explicit, logged conversion.
- **Remediation (report wording):** Fix the settlement currency to the link’s stored currency; convert explicitly with a rate if multi-currency is intended.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Settle a USD payment link in a different currency while the merchant is credited the full USD number.") — it must be rejected with no state change; then perform the normal Checkout & Payment Links workflow as a legitimate user — it must succeed.

### Negative Quantity Accepted at Checkout
- **Secure implementation:** Validate qty ≥ 1 (integer) and recompute totals server-side; reject non-positive payment totals.
- **Remediation (report wording):** Validate quantity as a positive integer within sensible bounds server-side; reject totals ≤ 0 for payments.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Create a paid transaction with a negative total by submitting a negative quantity.") — it must be rejected with no state change; then perform the normal Checkout & Payment Links workflow as a legitimate user — it must succeed.

### Cross-Merchant Payment Link Editing (IDOR)
- **Secure implementation:** Check link.merchantId === session merchant on every link operation.
- **Remediation (report wording):** Enforce per-object ownership checks on every read/write; use unguessable ids as defence in depth.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Modify or deactivate a payment link that belongs to a different merchant.") — it must be rejected with no state change; then perform the normal Checkout & Payment Links workflow as a legitimate user — it must succeed.

## Transactions & Receipts

### Cross-Merchant Transaction Details (IDOR)
- **Secure implementation:** Filter all transaction reads by the session merchant id.
- **Remediation (report wording):** Scope every transaction query to the authenticated merchant; return 404 for foreign objects.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Read full details of a transaction owned by another merchant.") — it must be rejected with no state change; then perform the normal Transactions & Receipts workflow as a legitimate user — it must succeed.

### Cross-Merchant Receipt Access (IDOR)
- **Secure implementation:** Scope receipt generation to transactions owned by the session merchant.
- **Remediation (report wording):** Apply the same ownership scoping to receipt/document routes as to the primary object routes.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Download a payment receipt belonging to another merchant’s customer.") — it must be rejected with no state change; then perform the normal Transactions & Receipts workflow as a legitimate user — it must succeed.

## Refunds

### Refund Exceeds the Original Payment
- **Secure implementation:** Validate refund amount against (captured − already refunded) before booking.
- **Remediation (report wording):** Enforce cumulative refunds ≤ captured amount, server-side, inside a transaction-safe check.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Refund more money than a transaction originally collected.") — it must be rejected with no state change; then perform the normal Refunds workflow as a legitimate user — it must succeed.

### Refund Another Merchant's Transaction
- **Secure implementation:** Enforce merchant ownership on the refund endpoint.
- **Remediation (report wording):** Require transaction.merchantId === session merchant for refund creation; log and alert on cross-tenant attempts.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Book a refund against a transaction owned by a different merchant.") — it must be rejected with no state change; then perform the normal Refunds workflow as a legitimate user — it must succeed.

### Double Refund on a Fully Refunded Payment
- **Secure implementation:** Check refundable remainder and transaction status before creating any refund.
- **Remediation (report wording):** Reject refunds on transactions whose refundable remainder is zero; make refund booking idempotent.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Refund an already fully-refunded transaction a second time.") — it must be rejected with no state change; then perform the normal Refunds workflow as a legitimate user — it must succeed.

## Webhooks

### Forged Webhook Event — No Signature Verification
- **Secure implementation:** Compute HMAC-SHA256 over the raw body with the endpoint secret and compare in constant time; process only on match.
- **Remediation (report wording):** Verify the HMAC signature of every webhook against the endpoint secret (constant-time compare) before processing; reject failures.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Get a self-invented payment event accepted and credited, with an invalid signature.") — it must be rejected with no state change; then perform the normal Webhooks workflow as a legitimate user — it must succeed.

### Webhook Signing Secret Exposed to Staff Role
- **Secure implementation:** Gate secret fields behind the owner role and mask them in all other responses.
- **Remediation (report wording):** Restrict secret-bearing responses to the owner role; mask secrets after creation; rotate on exposure.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Read the merchant’s webhook signing secret using a low-privilege staff account.") — it must be rejected with no state change; then perform the normal Webhooks workflow as a legitimate user — it must succeed.

## API & API Keys

### Read-Only API Key Can Create Charges
- **Secure implementation:** Check key.scope against the operation on each API route; deny writes to read-scoped keys.
- **Remediation (report wording):** Enforce per-endpoint scope checks (read vs write) for every API key on every route.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Create a real charge using an API key whose scope is read-only.") — it must be rejected with no state change; then perform the normal API & API Keys workflow as a legitimate user — it must succeed.

### Publishable Key Accepted on Secret Endpoints
- **Secure implementation:** Require secret keys for all server-side API endpoints; reject publishable keys explicitly.
- **Remediation (report wording):** Accept only secret keys on server-side endpoints; keep publishable keys limited to tokenising payments in the browser.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Read protected account data (the balance) using only the public publishable key.") — it must be rejected with no state change; then perform the normal API & API Keys workflow as a legitimate user — it must succeed.

## Payouts & Balance

### Payout Destination Changed at Request Time
- **Secure implementation:** Ignore request-supplied destinations; pay only the verified saved account.
- **Remediation (report wording):** Pay only to the verified on-file account; require re-authentication and a holding period for account changes.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Send a payout to a bank account that is not the merchant’s saved payout account.") — it must be rejected with no state change; then perform the normal Payouts & Balance workflow as a legitimate user — it must succeed.

### Payout Exceeds Available Balance
- **Secure implementation:** Validate amount ≤ available balance atomically at booking time.
- **Remediation (report wording):** Check available balance (minus holds/pending) inside the same transaction that books the payout.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Book a payout larger than the merchant’s available balance.") — it must be rejected with no state change; then perform the normal Payouts & Balance workflow as a legitimate user — it must succeed.

## Platform & Admin

### Debug Endpoint Exposes Secrets & Passwords
- **Secure implementation:** Delete the debug route from production; never render credentials or secrets in diagnostics.
- **Remediation (report wording):** Remove debug/diagnostic endpoints from production builds; gate any retained tooling behind admin auth and network restrictions.
- **Regression test:** Re-run the exploit from PRACTICE-GUIDE.md ("Open the leftover debug endpoint and read the platform’s secrets in plain text.") — it must be rejected with no state change; then perform the normal Platform & Admin workflow as a legitimate user — it must succeed.
